import {
    Injectable,
    Inject,
    forwardRef
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import {
    InternalServerErrorException,
    InvalidCredentialsException,
    ResourceNotFoundException,
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import {
    UserLoggedInEvent,
    UserLoginFailedEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    SessionRevokedEvent
} from '@/events/auth.events';
import { Request, Response } from 'express';
import { AuditEvents } from '@/audit/audit.events';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { UsersService } from '@/users/users.service';
import { SessionsService } from './sessions/sessions.service';
import { AuditService } from '@/audit/audit.service';
import { AuthTokens } from '@/auth/dtos/tokens.dto';

@Injectable()
export class AuthService {
    constructor (
        @Inject(forwardRef(() => UsersService))
        private readonly usersService: UsersService,

        @Inject(forwardRef(() => SessionsService))
        private readonly sessionsService: SessionsService,

        @Inject(forwardRef(() => AuditService))
        private readonly auditService: AuditService,

        private readonly eventEmitter: EventEmitter2,

        private readonly configService: ConfigService
    ) { }

    async login(
        user: User,
        request: Request
    ): Promise<AuthTokens> {
        const session = await this.sessionsService.getOrCreateSession({
            userId: user.id,
            userAgent: request.headers['user-agent'] ?? '',
            ipAddress: request.ip ?? ''
        });

        const accessToken = this.createAccessToken(user, session);
        const refreshToken = this.createRefreshToken(user, session);
        const refreshTimeoutMs = this.configService.get('jwt.refresh.timeoutMs');

        await session.setToken(refreshToken);
        session.tokenExpiresAt = new Date(Date.now() + refreshTimeoutMs);

        await this.sessionsService.saveSession(session);

        await this.eventEmitter.emitAsync(
            AuditEvents.LOGGED_IN,
            new UserLoggedInEvent(
                user.id,
                session.id,
                request.ip ?? '',
                request.headers['user-agent'] ?? ''
            )
        );

        return {
            access_token: accessToken,
            refresh_token: refreshToken
        };
    }

    async logout(
        session: Session,
        response: Response
    ): Promise<void> {
        await this.sessionsService.deleteSession(session);

        response.clearCookie('access_token');
        response.clearCookie('refresh_token');
    }

    async verifyUser(
        email: string,
        password: string,
        request: Request
    ): Promise<User> {
        let user: User;

        try {
            user = await this.usersService.findByEmail(email);
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                throw new InvalidCredentialsException(
                    'Invalid email or password'
                )
            } else {
                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error'
                );
            }
        }

        // Check if user account is locked out
        const locked = await user.isLockedOut();

        if (locked) {
            await this.eventEmitter.emitAsync(
                AuditEvents.LOCKED_USER_LOGIN_ATTEMPT,
                new LockedUserLoginAttemptEvent(
                    user.id,
                    request.ip ?? '',
                    request.headers['user-agent'] ?? ''
                )
            );

            throw new InvalidCredentialsException(
                'Account is currently locked out'
            );
        }

        const lockTimeoutMs = this.configService.get('users.lockTimeoutMs');
        const passwordMatches = await user.verifyPassword(password);

        if (!passwordMatches) {
            await this.eventEmitter.emitAsync(
                AuditEvents.LOGIN_FAILED,
                new UserLoginFailedEvent(
                    user.id,
                    user.email,
                    request.ip ?? '',
                    request.headers['user-agent'] ?? ''
                )
            );

            const shouldLock = await this.hasXRecentFailedLogins(
                user,
                lockTimeoutMs
            );

            if (shouldLock) {
                user.lock(lockTimeoutMs);
                await this.usersService.save(user);

                await this.eventEmitter.emitAsync(
                    AuditEvents.USER_ACCOUNT_LOCKED,
                    new UserAccountLockedEvent(
                        user.id,
                        request.ip ?? '',
                        request.headers['user-agent'] ?? '',
                        'AUTO',
                        'Third unsuccessful login within lockout period'
                    )
                );
            }

            throw new InvalidCredentialsException(
                'Invalid email or password'
            );
        }

        return user;
    }

    async verifyToken(
        token: string,
        userId: number
    ): Promise<User> {
        let session: Session|null = null;

        const sessions =
            await this.sessionsService.findByUserId(userId);

        for (const s of sessions) {
            const tokenMatches = await s.verifyToken(token);

            if (tokenMatches) {
                session = s;
                break;
            }
        }

        if (!session) {
            throw new SessionNotFoundException(
                'Invalid token'
            );
        }

        if (session.tokenExpiresAt && session.tokenExpiresAt < new Date()) {
            throw new SessionExpiredException(
                'Session expired',
                {
                    'token_expired_at': session.tokenExpiresAt
                }
            );
        }

        return session.user;
    }

    async hasXRecentFailedLogins(
        user: User,
        lockTimeoutMs: number
    ): Promise<boolean> {
        const maxFailedLogins = this.configService.get('users.maxFailedLogins');

        const count =
            await this.auditService.getRecentFailedLoginCount(
                user,
                lockTimeoutMs
            );

        return count > maxFailedLogins;
    }

    createAccessToken(
        user: User,
        session: Session
    ): string {
        const service = new JwtService();
        const secret = this.configService.get('jwt.access.secret');
        const accessTimeoutMs = this.configService.get('jwt.access.timeoutMs');

        return service.sign({
            sub: user.id,
            sid: session.id,
            type: 'access'
        }, {
            secret: secret,
            expiresIn: `${accessTimeoutMs}ms`,
            jwtid: randomUUID()
        });
    }

    createRefreshToken(
        user: User,
        session: Session
    ): string {
        const service = new JwtService();
        const secret = this.configService.get('jwt.refresh.secret');
        const refreshTimeoutMs = this.configService.get('jwt.refresh.timeoutMs');

        return service.sign({
            sub: user.id,
            sid: session.id,
            type: 'refresh'
        }, {
            secret: secret,
            expiresIn: `${refreshTimeoutMs}ms`,
            jwtid: randomUUID()
        });
    }

    async revokeSession(
        session: Session,
        reason: string,
        request: Request
    ): Promise<void> {
        await this.sessionsService.deleteSession(session);

        await this.eventEmitter.emitAsync(
            AuditEvents.SESSION_REVOKED,
            new SessionRevokedEvent(
                session.userId,
                session.id,
                request.ip ?? '',
                request.headers['user-agent'] ?? '',
                reason,
                'AUTO'
            )
        );
    }
}
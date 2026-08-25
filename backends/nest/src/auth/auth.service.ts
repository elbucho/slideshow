import {
    Injectable,
    Inject,
    forwardRef
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
    InternalServerErrorException,
    InvalidCredentialsException,
    ResourceNotFoundException,
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import {
    AuthEvents,
    UserLoggedInEvent,
    UserLoggedOutEvent,
    UserLoginFailedEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    SessionRevokedEvent,
    TokenMismatchEvent,
    SessionTokenExpiredEvent,
    SessionNotFoundEvent,
    UnknownServerErrorEvent
} from '@/events/auth.events';
import { Request } from 'express';
import argon2 from 'argon2';
import { AuditEvents } from '@/audit/audit.events';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { UsersService } from '@/users/users.service';
import { SessionsService } from './sessions/sessions.service';
import { AuditService } from '@/audit/audit.service';
import { AuthTokens } from '@/auth/dtos/tokens.dto';
import { UserState } from '@/database/entities/user-state.entity';
import { UserStatesService } from '@/states/user-states.service';

@Injectable()
export class AuthService {
    constructor (
        @Inject(forwardRef(() => UsersService))
        private readonly usersService: UsersService,

        @Inject(forwardRef(() => SessionsService))
        private readonly sessionsService: SessionsService,

        @Inject(forwardRef(() => AuditService))
        private readonly auditService: AuditService,

        @Inject(forwardRef(() => UserStatesService))
        private readonly userStatesService: UserStatesService,

        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,

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
        userId: number,
        sessionId: number,
        request: Request
    ): Promise<void> {
        let session: Session;

        try {
            session = await this.sessionsService.findById(sessionId);
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                await this.eventEmitter.emitAsync(
                    AuthEvents.SESSION_NOT_FOUND,
                    new SessionNotFoundEvent(
                        userId,
                        sessionId,
                        request.ip ?? ''
                    )
                );

                throw new SessionNotFoundException(
                    'Invalid token'
                );
            } else {
                await this.eventEmitter.emitAsync(
                    AuthEvents.UNKNOWN_SERVER_ERROR,
                    new UnknownServerErrorEvent(
                        `User id: ${userId}, Session id: ${sessionId}`,
                        request.ip ?? '',
                        exception
                    )
                );

                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error'
                );
            }
        }

        await this.sessionsService.deleteSession(session);

        await this.eventEmitter.emitAsync(
            AuditEvents.LOGGED_OUT,
            new UserLoggedOutEvent(
                session.userId,
                session.id
            )
        );
    }

    createAccessToken(
        user: User,
        session: Session
    ): string {
        const service = new JwtService();

        const secret = this.configService.get(
            'jwt.access.secret'
        );

        const accessTimeoutMs = this.configService.get(
            'jwt.access.timeoutMs'
        );

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

        const secret = this.configService.get(
            'jwt.refresh.secret'
        );

        const refreshTimeoutMs = this.configService.get(
            'jwt.refresh.timeoutMs'
        );

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

    async getUserFromCredentials(
        identifier: string,
        password: string,
        request: Request
    ): Promise<User> {
        const user = await this.usersService.findByUsernameOrEmail(
            identifier,
            true
        );

        await this.verifyUserIsNotLocked(user, request);
        await this.verifyUserPasswordMatches(user, password, request);

        return user;
    }

    async getUserFromRefreshToken(
        token: string,
        sessionId: number,
        request: Request
    ): Promise<User> {
        const session = await this.sessionsService.findById(
            sessionId,
            true
        );

        await this.verifyTokenMatchesSession(session, token, request);
        await this.verifySessionIsNotExpired(session, request);
        await this.verifyUserIsNotLocked(session.user, request);

        return session.user;
    }

    async getUserFromTemporaryToken(
        token: string,
        userStateId: number,
        request: Request
    ): Promise<User> {
        const userState = await this.userStatesService.findById(
            userStateId,
            true
        );

        await this.verifyTokenMatchesUserState(userState, token, request);
        await this.verifyUserIsNotLocked(userState.user, request);

        return userState.user;
    }

    async verifyUserIsNotLocked(
        user: User,
        request: Request
    ): Promise<void> {
        if (user.hasState('ACCOUNT_LOCKED')) {
            await this.eventEmitter.emitAsync(
                AuthEvents.LOCKED_USER_LOGIN_ATTEMPT,
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
    }

    async verifyUserPasswordMatches(
        user: User,
        password: string,
        request: Request
    ): Promise<void> {
        const passwordMatches = await user.verifyPassword(password);

        if (!passwordMatches) {
            await this.eventEmitter.emitAsync(
                AuthEvents.INVALID_PASSWORD,
                new UserLoginFailedEvent(
                    user.id,
                    user.email,
                    request.ip ?? '',
                    request.headers['user-agent'] ?? ''
                )
            );

            await this.checkIfShouldLockUser(user, request);

            throw new InvalidCredentialsException(
                'Invalid username or password'
            );
        }
    }

    async verifyTokenMatchesSession(
        session: Session,
        token: string,
        request: Request
    ): Promise<void> {
        const verified = await session.verifyToken(token);

        if (!verified) {
            await this.eventEmitter.emitAsync(
                AuthEvents.TOKEN_SESSION_MISMATCH,
                new TokenMismatchEvent(
                    session.id,
                    session.userId,
                    request.ip ?? '',
                    request.headers['user-agent'] ?? ''
                )
            );

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }
    }

    async verifyTokenMatchesUserState(
        userState: UserState,
        token: string,
        request: Request
    ): Promise<void> {
        const tokenHash: string = userState.data && userState.data.tokenHash
            ? userState.data.tokenHash as string
            : '';

        const verified = await argon2.verify(tokenHash, token);

        if (!verified) {
            await this.eventEmitter.emitAsync(
                AuthEvents.TOKEN_STATE_MISMATCH,
                new TokenMismatchEvent(
                    userState.id,
                    userState.userId,
                    request.ip ?? '',
                    request.headers['user-agent'] ?? ''
                )
            );

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }
    }

    async verifySessionIsNotExpired(
        session: Session,
        request: Request
    ): Promise<void> {
        if (session.tokenExpiresAt && session.tokenExpiresAt < new Date()) {
            await this.eventEmitter.emitAsync(
                AuthEvents.SESSION_TOKEN_EXPIRED,
                new SessionTokenExpiredEvent(
                    'refresh',
                    session.id,
                    session.userId,
                    session.tokenExpiresAt,
                    request.ip ?? '',
                    request.headers['user-agent'] ?? ''
                )
            );

            throw new SessionExpiredException(
                'Session expired',
                {
                    'token_expired_at': session.tokenExpiresAt
                }
            );
        }
    }

    async checkIfShouldLockUser(
        user: User,
        request: Request
    ): Promise<void> {
        const maxFailedLogins = this.configService.get('users.maxFailedLogins') as number;
        const lockTimeoutMs = this.configService.get('users.lockTimeoutMs') as number;

        const count =
            await this.auditService.getRecentFailedLoginCount(
                user,
                lockTimeoutMs
            );

        if (count >= maxFailedLogins) {
            await this.lockUser(
                user,
                lockTimeoutMs,
                request
            );
        }
    }

    async lockUser(
        user: User,
        lockTimeoutMs: number,
        request: Request
    ): Promise<void> {
        await this.usersService.setState(
            user,
            'ACCOUNT_LOCKED',
            null,
            new Date(Date.now() + lockTimeoutMs)
        );

        await this.eventEmitter.emitAsync(
            AuditEvents.USER_ACCOUNT_LOCKED,
            new UserAccountLockedEvent(
                user.id,
                request.ip ?? '',
                request.headers['user-agent'] ?? '',
                'AUTO',
                'Max unsuccessful login count within lockout period exceeded'
            )
        );
    }
}
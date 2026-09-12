import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';
import { UserState } from '@/database/entities/user-state.entity';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import {
    QueryBuilder,
    QueryBuilderFactory
} from '@/database/queries/query.builder';
import { UserStateName } from '@/states/user-states.types';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import {
    InvalidCredentialsException,
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import {
    AuthEvents,
    LockedUserLoginAttemptEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent,
    StateNotFoundEvent,
    TokenMismatchEvent,
    UserAccountLockedEvent,
    UserLoginFailedEvent,
    UserNotFoundEvent
} from '@/events/auth.events';

@Injectable()
export class SecurityService {
    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly userStatesService: UserStatesService,
        private readonly cryptService: CryptService,
        private readonly queryBuilderFactory: QueryBuilderFactory,

        @InjectRepository(Session)
        private readonly sessionsRepository: Repository<Session>,

        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        @InjectRepository(UserState)
        private readonly userStatesRepository: Repository<UserState>,

        @InjectRepository(AuditLog)
        private readonly auditLogsRepository: Repository<AuditLog>
    ) { }

    private get sessionsBuilder(): QueryBuilder<Session> {
        return this.queryBuilderFactory.create<Session>(
            this.sessionsRepository,
            'session'
        );
    }

    private get usersBuilder(): QueryBuilder<User> {
        return this.queryBuilderFactory.create<User>(
            this.usersRepository,
            'user'
        );
    }

    private get userStatesBuilder(): QueryBuilder<UserState> {
        return this.queryBuilderFactory.create<UserState>(
            this.userStatesRepository,
            'user_state'
        );
    }

    private get auditLogsBuilder(): QueryBuilder<AuditLog> {
        return this.queryBuilderFactory.create<AuditLog>(
            this.auditLogsRepository,
            'audit_log'
        );
    }

    private async findUserOrFail(
        username: string,
        context: AuthContext
    ): Promise<User> {
        const user =
            await this.usersBuilder
                .where(
                    'user.username = :username ' +
                    'OR user.email = :username',
                    { username }
                ).addOptions({
                    expand: [ 'states.state' ]
                }).getOne();

        if (user) return user;

        await this.eventEmitter.emitAsync(
            AuthEvents.USER_NOT_FOUND,
            new UserNotFoundEvent(
                username,
                context.ipAddress
            )
        );

        throw new InvalidCredentialsException(
            'Invalid username or password'
        );
    }

    private async findSession(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<Session|null> {
        const where = authUser.sessionId
            ? 'session.user_id = :userId ' +
                'AND session.id = :sessionId'
            : 'session.user_id = :userId ' +
                'AND session.user_agent = :userAgent ' +
                'AND session.ip_address = :ipAddress';

        const params = authUser.sessionId
            ? { ...authUser }
            : { userId: authUser.userId, ...context };

        return this.sessionsBuilder
            .where(
                where,
                params
            ).addOptions({
                expand: [
                    'user.states.state'
                ]
            }).getOne();
    }

    private async findSessionOrFail(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<Session> {
        const session =
            await this.findSession(
                authUser,
                context
            );

        if (session) return session;

        await this.eventEmitter.emitAsync(
            AuthEvents.SESSION_NOT_FOUND,
            new SessionNotFoundEvent(
                authUser.userId,
                authUser.sessionId as number,
                context.ipAddress,
                context.userAgent
            )
        );

        throw new SessionNotFoundException(
            'Invalid token'
        );
    }

    private async findUserStateOrFail(
        userId: number,
        userStateId: number,
        context: AuthContext
    ): Promise<UserState> {
        const userState =
            await this.userStatesBuilder
                .where(
                    'user_state.id = :userStateId AND ' +
                    'user_state.user_id = :userId',
                    {
                        userId,
                        userStateId
                    }
                ).addOptions({
                    expand: [ 'user' ]
                }).getOne();

        if (userState) return userState;

        await this.eventEmitter.emitAsync(
            AuthEvents.STATE_NOT_FOUND,
            new StateNotFoundEvent(
                userId,
                userStateId,
                context.ipAddress
            )
        );

        throw new SessionNotFoundException(
            'Invalid token'
        );
    }

    private async getFailedLoginsSince(
        userId: number,
        cutoff: Date
    ): Promise<number> {
        return this.auditLogsBuilder
            .where(
                'user_id = :userId AND event = :event ' +
                'AND created_at >= :cutoff',
                {
                    userId,
                    cutoff,
                    event: AuthEvents.INVALID_PASSWORD,
                }
            ).getCount();
    }

    private async checkIfShouldLockAccount(
        userId: number
    ): Promise<boolean> {
        const maxFailedLogins =
            this.configService.get(
                'users.maxFailedLogins'
            );

        const lockTimeoutMs =
            this.configService.get(
                'users.lockTimeoutMs'
            );

        const totalFailedLogins =
            await this.getFailedLoginsSince(
                userId,
                new Date(Date.now() - lockTimeoutMs)
            );

        return totalFailedLogins >= maxFailedLogins;
    }

    private async verifyPassword(
        user: User,
        password: string,
        context: AuthContext
    ): Promise<boolean> {
        const passwordHash = user.getHashedPassword();
        const passwordMatches =
            await this.cryptService.verify(
                passwordHash,
                password
            );

        if (passwordMatches) return true;

        await this.eventEmitter.emitAsync(
            AuthEvents.INVALID_PASSWORD,
            new UserLoginFailedEvent(
                user.id,
                user.email,
                context.ipAddress,
                context.userAgent
            )
        );

        return false;
    }

    private async verifySessionToken(
        session: Session,
        token: string,
        context: AuthContext
    ) {
        const tokenHash = session.getHashedToken();
        const tokenMatches = tokenHash
            ?
            await this.cryptService.verify(
                tokenHash,
                token
            )
            : false;

        if (tokenMatches) return true;

        await this.eventEmitter.emitAsync(
            AuthEvents.TOKEN_SESSION_MISMATCH,
            new TokenMismatchEvent(
                session.id,
                session.userId,
                context.ipAddress,
                context.userAgent
            )
        );

        throw new SessionNotFoundException(
            'Invalid token'
        );
    }

    private async verifyStateToken(
        userState: UserState,
        token: string,
        context: AuthContext
    ): Promise<void> {
        const tokenHash = userState.getHashedToken();
        const tokenMatches = tokenHash
            ?
            await this.cryptService.verify(
                tokenHash,
                token
            )
            : false;

        if (tokenMatches) return;

        await this.eventEmitter.emitAsync(
            AuthEvents.TOKEN_STATE_MISMATCH,
            new TokenMismatchEvent(
                userState.id,
                userState.userId,
                context.ipAddress,
                context.userAgent
            )
        );

        throw new SessionNotFoundException(
            'Invalid token'
        );
    }

    private async verifySessionNotExpired(
        session: Session,
        context: AuthContext
    ): Promise<void> {
        if (
            !session.tokenExpiresAt ||
            session.tokenExpiresAt > new Date()
        ) return;

        await this.eventEmitter.emitAsync(
            AuthEvents.SESSION_TOKEN_EXPIRED,
            new SessionTokenExpiredEvent(
                'refresh',
                session.id,
                session.userId,
                session.tokenExpiresAt,
                context.ipAddress,
                context.userAgent
            )
        );

        throw new SessionExpiredException(
            'Session expired',
            {
                tokenExpiredAt: session.tokenExpiresAt
            }
        );
    }

    private async verifyNotLocked(
        user: User,
        context: AuthContext
    ): Promise<void> {
        const isLocked =
            user.hasState(
                UserStateName.ACCOUNT_LOCKED
            );

        if (!isLocked) return;

        await this.eventEmitter.emitAsync(
            AuthEvents.LOCKED_USER_LOGIN_ATTEMPT,
            new LockedUserLoginAttemptEvent(
                user.id,
                context.ipAddress,
                context.userAgent
            )
        );

        throw new InvalidCredentialsException(
            'Account is currently locked out'
        );
    }

    async lockUser(
        user: User,
        context: AuthContext
    ): Promise<void> {
        const state =
            await this.userStatesService
                .findOrCreate(
                    user.id,
                    UserStateName.ACCOUNT_LOCKED
                );

        const lockTimeoutMs =
            this.configService.get(
                'users.lockTimeoutMs'
            );

        state.expiresAt = new Date(
            Date.now() + lockTimeoutMs
        );
        user.setState(state);

        await this.usersRepository.save(
            user
        );

        await this.eventEmitter.emitAsync(
            AuthEvents.USER_ACCOUNT_LOCKED,
            new UserAccountLockedEvent(
                user.id,
                context.ipAddress,
                context.userAgent,
                'AUTO',
                'Max unsuccessful login count within ' +
                'lockout period exceeded'
            )
        );
    }

    async verifyCredentials(
        username: string,
        password: string,
        context: AuthContext
    ): Promise<AuthUser> {
        const user = await this.findUserOrFail(
            username,
            context
        );

        const verified =
            await this.verifyPassword(
                user,
                password,
                context
            );

        if (!verified) {
            const shouldLock =
                await this.checkIfShouldLockAccount(
                    user.id
                );

            if (shouldLock) {
                await this.lockUser(
                    user,
                    context
                );
            }

            throw new InvalidCredentialsException(
                'Invalid username or password'
            );
        }

        await this.verifyNotLocked(
            user,
            context
        );

        const session = await this.findSession(
            { userId: user.id },
            context
        );

        return {
            userId: user.id,
            sessionId: session ? session.id : undefined
        };
    }

    async verifyRefreshToken(
        token: string,
        authUser: AuthUser,
        context: AuthContext
    ): Promise<AuthUser> {
        const session =
            await this.findSessionOrFail(
                authUser,
                context
            );

        await this.verifySessionToken(
            session,
            token,
            context
        );

        await this.verifySessionNotExpired(
            session,
            context
        );

        await this.verifyNotLocked(
            session.user,
            context
        );

        return {
            userId: session.userId,
            sessionId: session.id
        };
    }

    async verifyTemporaryToken(
        token: string,
        userId: number,
        userStateId: number,
        context: AuthContext
    ): Promise<AuthUser> {
        const userState =
            await this.findUserStateOrFail(
                userId,
                userStateId,
                context
            );

        await this.verifyStateToken(
            userState,
            token,
            context
        );

        await this.verifyNotLocked(
            userState.user,
            context
        );

        return {
            userId
        };
    }
}
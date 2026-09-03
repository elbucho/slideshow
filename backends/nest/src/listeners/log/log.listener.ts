import {
    Inject,
    Injectable,
    type LoggerService
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    AuthEvents,
    UserLoggedInEvent,
    UserLoggedOutEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    UserLoginFailedEvent,
    TokenMismatchEvent,
    UserNotFoundEvent,
    UnknownServerErrorEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent
} from '@/events/auth.events';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LogListener {
    constructor (
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ) { }

    @OnEvent(AuthEvents.LOGGED_IN)
    async handleUserLoggedIn(
        event: UserLoggedInEvent
    ): Promise<void> {
        this.logger.log(
            'User logged in',
            {
                userId: event.userId,
                sessionId: event.sessionId,
                ipAddr: event.ipAddress ?? ''
            }
        );
    }

    @OnEvent(AuthEvents.LOGGED_OUT)
    async handleUserLoggedOut(
        event: UserLoggedOutEvent
    ): Promise<void> {
        this.logger.log(
            'User logged out',
            {
                userId: event.userId,
                sessionId: event.sessionId
            }
        );
    }

    @OnEvent(AuthEvents.INVALID_PASSWORD)
    async handleInvalidPassword(
        event: UserLoginFailedEvent
    ): Promise<void> {
        this.logger.error(
            'User failed login',
            {
                reason: 'Invalid password',
                userId: event.userId,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.LOCKED_USER_LOGIN_ATTEMPT)
    async handleLockedUserLogin(
        event: LockedUserLoginAttemptEvent
    ): Promise<void> {
        this.logger.error(
            'User failed login',
            {
                reason: 'Account is locked',
                userId: event.userId,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.USER_ACCOUNT_LOCKED)
    async handleUserAccountLocked(
        event: UserAccountLockedEvent
    ): Promise<void> {
        this.logger.warn(
            'User account locked',
            {
                reason: event.lockedReason,
                lockedBy: event.lockedBy,
                userId: event.userId,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.USER_NOT_FOUND)
    async handleUserNotFound(
        event: UserNotFoundEvent
    ): Promise<void> {
        this.logger.error(
            'User failed login',
            {
                reason: 'Invalid username / email',
                identifier: event.identifier,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.UNKNOWN_SERVER_ERROR)
    async handleUnknownServerError(
        event: UnknownServerErrorEvent
    ): Promise<void> {
        this.logger.error(
            'User failed login',
            {
                reason: 'Unknown server error',
                identifier: event.identifier,
                ipAddr: event.ipAddress,
                exception: event.exception
            }
        );
    }

    @OnEvent(AuthEvents.SESSION_NOT_FOUND)
    async handleSessionNotFound(
        event: SessionNotFoundEvent
    ): Promise<void> {
        this.logger.error(
            'Token auth failed',
            {
                reason: 'No matching session found',
                userId: event.userId,
                sessionId: event.sessionId,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.SESSION_TOKEN_EXPIRED)
    async handleSessionTokenExpired(
        event: SessionTokenExpiredEvent
    ): Promise<void> {
        this.logger.error(
            'Token auth failed',
            {
                reason: `${event.type} token expired`,
                userId: event.userId,
                sessionId: event.sessionId,
                expiredAt: event.expiredAt,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.TOKEN_SESSION_MISMATCH)
    async handleTokenSessionMismatch(
        event: TokenMismatchEvent
    ): Promise<void> {
        this.logger.error(
            'Token auth failed',
            {
                type: 'Session',
                reason: 'Token hash doesn\'t match',
                sessionId: event.resourceId,
                userId: event.userId,
                ipAddr: event.ipAddress
            }
        );
    }

    @OnEvent(AuthEvents.TOKEN_STATE_MISMATCH)
    async handleTokenStateMismatch(
        event: TokenMismatchEvent
    ): Promise<void> {
        this.logger.error(
            'Token auth failed',
            {
                type: 'UserState',
                reason: 'Token hash doesn\'t match',
                userStateId: event.resourceId,
                userId: event.userId,
                ipAddr: event.ipAddress
            }
        );
    }
}
import {
    Inject,
    Injectable,
    type LoggerService
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    UserLoggedInEvent,
    UserLoggedOutEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    SessionRevokedEvent
} from '@/events/auth.events';
import { AuditEvents } from '@/audit/audit.events';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LogListener {
    constructor (
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ) { }

    @OnEvent(AuditEvents.LOGGED_IN)
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

    @OnEvent(AuditEvents.LOGGED_OUT)
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

    @OnEvent(AuditEvents.LOCKED_USER_LOGIN_ATTEMPT)
    async handleLockedUserLogin(
        event: LockedUserLoginAttemptEvent
    ): Promise<void> {
        this.logger.error(
            'User failed login',
            {
                reason: 'Account is locked',
                userId: event.userId,
                ip: event.ipAddress
            }
        );
    }

    @OnEvent(AuditEvents.USER_ACCOUNT_LOCKED)
    async handleUserAccountLocked(
        event: UserAccountLockedEvent
    ): Promise<void> {
        this.logger.warn(
            'User account locked',
            {
                reason: event.lockedReason,
                lockedBy: event.lockedBy,
                userId: event.userId,
                ip: event.ipAddress
            }
        );
    }

    @OnEvent(AuditEvents.SESSION_REVOKED)
    async handleSessionRevoked(
        event: SessionRevokedEvent
    ): Promise<void> {
        this.logger.warn(
            'User session revoked',
            {
                userId: event.userId,
                sessionId: event.sessionId,
                revokeReason: event.revokeReason,
                revokedBy: event.revokedBy
            }
        );
    }
}
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    AuthEvents,
    UserLoggedInEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    UserLoginFailedEvent,
    TokenMismatchEvent
} from '@/events/auth.events';
import { AuditLog } from '@/database/entities/audit-log.entity';

@Injectable()
export class AuditListener {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogs: Repository<AuditLog>
    ) {}

    @OnEvent(AuthEvents.LOGGED_IN)
    async handleUserLoggedIn(
        event: UserLoggedInEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.LOGGED_IN;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuthEvents.INVALID_PASSWORD)
    async handleInvalidPassword(
        event: UserLoginFailedEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.INVALID_PASSWORD;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuthEvents.USER_ACCOUNT_LOCKED)
    async handleUserAccountLocked(
        event: UserAccountLockedEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.USER_ACCOUNT_LOCKED;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_agent: event.userAgent,
            locked_by: event.lockedBy,
            locked_reason: event.lockedReason
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuthEvents.LOCKED_USER_LOGIN_ATTEMPT)
    async handleLockedUserLoginAttempt(
        event: LockedUserLoginAttemptEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.LOCKED_USER_LOGIN_ATTEMPT;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuthEvents.TOKEN_SESSION_MISMATCH)
    async handleTokenSessionMismatch(
        event: TokenMismatchEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.TOKEN_SESSION_MISMATCH;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.resourceId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);

    }

    @OnEvent(AuthEvents.TOKEN_STATE_MISMATCH)
    async handleTokenStateMismatch(
        event: TokenMismatchEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.TOKEN_STATE_MISMATCH;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_state_id: event.resourceId,
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

/*    @OnEvent(AuthEvents.IP_ADDR_MISMATCH)
    async handleIpAddrMismatch(
        event: SessionIpMismatchEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.IP_ADDR_MISMATCH;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            user_agent: event.userAgent,
            expected_ip: event.expectedIpAddress,
            actual_ip: event.actualIpAddress
        };
        auditLog.ipAddress = event.actualIpAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuthEvents.USER_AGENT_MISMATCH)
    async handleUserAgentMismatch(
        event: SessionUserAgentMismatchEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.USER_AGENT_MISMATCH;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            expected_user_agent: event.expectedUserAgent,
            actual_user_agent: event.actualUserAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuthEvents.SESSION_REVOKED)
    async handleSessionRevoked(
        event: SessionRevokedEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuthEvents.SESSION_REVOKED;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            user_agent: event.userAgent,
            revoke_reason: event.revokeReason,
            revoked_by: event.revokedBy
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    } */
}
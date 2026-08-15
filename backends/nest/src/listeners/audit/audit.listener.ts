import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    UserLoggedInEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    SessionUserAgentMismatchEvent,
    SessionIpMismatchEvent,
    SessionRevokedEvent,
    UserLoginFailedEvent,
} from '@/events/auth.events';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AuditEvents } from '@/audit/audit.events';

@Injectable()
export class AuditListener {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogs: Repository<AuditLog>
    ) {}

    @OnEvent(AuditEvents.LOGGED_IN)
    async handleUserLoggedIn(
        event: UserLoggedInEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.LOGGED_IN;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuditEvents.LOGIN_FAILED)
    async handleLoginFailed(
        event: UserLoginFailedEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.LOGIN_FAILED;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuditEvents.USER_ACCOUNT_LOCKED)
    async handleUserAccountLocked(
        event: UserAccountLockedEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.USER_ACCOUNT_LOCKED;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_agent: event.userAgent,
            locked_by: event.lockedBy,
            locked_reason: event.lockedReason
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuditEvents.LOCKED_USER_LOGIN_ATTEMPT)
    async handleLockedUserLoginAttempt(
        event: LockedUserLoginAttemptEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.LOCKED_USER_LOGIN_ATTEMPT;
        auditLog.userId = event.userId;
        auditLog.data = {
            user_agent: event.userAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuditEvents.IP_ADDR_MISMATCH)
    async handleIpAddrMismatch(
        event: SessionIpMismatchEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.IP_ADDR_MISMATCH;
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

    @OnEvent(AuditEvents.USER_AGENT_MISMATCH)
    async handleUserAgentMismatch(
        event: SessionUserAgentMismatchEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.USER_AGENT_MISMATCH;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            expected_user_agent: event.expectedUserAgent,
            actual_user_agent: event.actualUserAgent
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }

    @OnEvent(AuditEvents.SESSION_REVOKED)
    async handleSessionRevoked(
        event: SessionRevokedEvent
    ): Promise<void> {
        const auditLog = new AuditLog();

        auditLog.event = AuditEvents.SESSION_REVOKED;
        auditLog.userId = event.userId;
        auditLog.sessionId = event.sessionId;
        auditLog.data = {
            user_agent: event.userAgent,
            revoke_reason: event.revokeReason,
            revoked_by: event.revokedBy
        };
        auditLog.ipAddress = event.ipAddress;

        await this.auditLogs.save(auditLog);
    }
}
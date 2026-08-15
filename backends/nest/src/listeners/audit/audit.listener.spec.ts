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
import { AuditListener } from './audit.listener';

describe('AuditListener', () => {
    let auditLogs: jest.Mocked<Repository<AuditLog>>;
    let auditListener: AuditListener;

    beforeAll(() => {
        auditLogs = {
            save: jest.fn()
        } as any as jest.Mocked<Repository<AuditLog>>;

        auditListener = new AuditListener(auditLogs);
    });

    beforeEach(() => {
        auditLogs.save.mockResolvedValue({} as AuditLog);
    })

    describe('handleUserLogin', () => {
        it('should create an audit log when a user logs in', async () => {
            const event = {
                userId: 1,
                sessionId: 2,
                userAgent: 'Mozilla/5.0',
                ipAddress: '127.0.0.1'
            } as UserLoggedInEvent;

            await auditListener.handleUserLoggedIn(event);

            expect(auditLogs.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: AuditEvents.LOGGED_IN,
                    userId: 1,
                    sessionId: 2,
                    data: {
                        user_agent: 'Mozilla/5.0'
                    },
                    ipAddress: '127.0.0.1'
                })
            );
        });
    });

    describe('handleLoginFailed', () => {
        it('should create an audit log when a user fails to login', async () => {
            const event = {
                userId: 1,
                email: 'test@example.com',
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0'
            } as UserLoginFailedEvent;

            await auditListener.handleLoginFailed(event);

            expect(auditLogs.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: AuditEvents.LOGIN_FAILED,
                    userId: 1,
                    data: {
                        user_agent: 'Mozilla/5.0'
                    },
                    ipAddress: '127.0.0.1'
                })
            );
        });
    });

    describe('handleUserAccountLocked', () => {
        it('should create an audit log when a user\'s account becomes locked', async () => {
            const event = {
                userId: 1,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                lockedBy: 'AUTO',
                lockedReason: 'test'
            } as UserAccountLockedEvent;

            await auditListener.handleUserAccountLocked(event);

            expect(auditLogs.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: AuditEvents.USER_ACCOUNT_LOCKED,
                    userId: 1,
                    data: {
                        user_agent: 'Mozilla/5.0',
                        locked_by: 'AUTO',
                        locked_reason: 'test'
                    },
                    ipAddress: '127.0.0.1'
                })
            );
        });
    });

    describe('handleLockedUserLoginAttempt', () => {
        it(
            'should create an audit log when a user attempts to log ' +
            'into a locked account',
            async () => {
                const event = {
                    userId: 1,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Mozilla/5.0'
                } as LockedUserLoginAttemptEvent;

                await auditListener.handleLockedUserLoginAttempt(event);

                expect(auditLogs.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        event: AuditEvents.LOCKED_USER_LOGIN_ATTEMPT,
                        userId: 1,
                        data: {
                            user_agent: 'Mozilla/5.0'
                        },
                        ipAddress: '127.0.0.1'
                    })
                );
            }
        );
    });

    describe('handleIpAddrMismatch', () => {
        it(
            'should create an audit log when the IP associated with ' +
            'the session is not the same as the user\'s IP',
            async () => {
                const event = {
                    userId: 1,
                    sessionId: 2,
                    userAgent: 'Mozilla/5.0',
                    expectedIpAddress: '127.0.0.1',
                    actualIpAddress: '127.0.0.2'
                } as SessionIpMismatchEvent;

                await auditListener.handleIpAddrMismatch(event);

                expect(auditLogs.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        event: AuditEvents.IP_ADDR_MISMATCH,
                        userId: 1,
                        sessionId: 2,
                        data: {
                            user_agent: 'Mozilla/5.0',
                            expected_ip: '127.0.0.1',
                            actual_ip: '127.0.0.2'
                        },
                        ipAddress: '127.0.0.2'
                    })
                );
            }
        );
    });

    describe('handleUserAgentMismatch', () => {
        it(
            'should create an audit log when the user-agent associated ' +
            'with the session is not the same as the presented user-agent',
            async () => {
                const event = {
                    userId: 1,
                    sessionId: 2,
                    ipAddress: '127.0.0.1',
                    expectedUserAgent: 'Mozilla/5.0',
                    actualUserAgent: 'AppleWebKit/537.36'
                } as SessionUserAgentMismatchEvent;

                await auditListener.handleUserAgentMismatch(event);

                expect(auditLogs.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        event: AuditEvents.USER_AGENT_MISMATCH,
                        userId: 1,
                        sessionId: 2,
                        data: {
                            expected_user_agent: 'Mozilla/5.0',
                            actual_user_agent: 'AppleWebKit/537.36'
                        },
                        ipAddress: '127.0.0.1'
                    })
                );
            }
        );
    });

    describe('handleSessionRevoked', () => {
        it('should create an audit log when the user\'s session is revoked', async () => {
            const event = {
                userId: 1,
                sessionId: 2,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                revokeReason: 'test',
                revokedBy: 'AUTO'
            } as SessionRevokedEvent;

            await auditListener.handleSessionRevoked(event);

            expect(auditLogs.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: AuditEvents.SESSION_REVOKED,
                    userId: 1,
                    sessionId: 2,
                    data: {
                        user_agent: 'Mozilla/5.0',
                        revoke_reason: 'test',
                        revoked_by: 'AUTO'
                    },
                    ipAddress: '127.0.0.1'
                })
            );
        });
    });
});
import { Repository, MoreThan } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AuditService } from '@/audit/audit.service';
import { AuditEvents } from '@/audit/audit.events';
describe('AuditService', () => {
    let auditService: AuditService;
    let auditLogs: jest.Mocked<Repository<AuditLog>>;

    beforeAll(() => {
        auditLogs = {
            count: jest.fn()
        } as any as jest.Mocked<Repository<AuditLog>>;

        auditService = new AuditService(auditLogs);
    });

    describe('getRecentFailedLoginCount', () => {
        it('should provide a count of the number of recent unsuccessful logins', () => {
            const user = {
                id: 1
            } as any as User;
            auditLogs.count.mockResolvedValue(1);

            expect(
                auditService.getRecentFailedLoginCount(
                    user,
                    1000
                )
            ).resolves.toBe(1);

            expect(auditLogs.count).toHaveBeenCalledWith({
                where: {
                    userId: 1,
                    event: AuditEvents.LOGIN_FAILED,
                    createdAt: MoreThan(expect.any(Date))
                }
            });
        });
    });
});
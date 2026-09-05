import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AuditService } from '@/audit/audit.service';
import { AuthEvents } from '@/events/auth.events';

describe('AuditService', () => {
    let repository: Repository<AuditLog>;
    let auditService: AuditService;

    beforeAll(() => {
        repository = {
            metadata: {
                name: 'AuditLog'
            }
        } as any as Repository<AuditLog>;

        auditService = new AuditService(
            repository
        );
    });

    describe('getRecentFailedLoginCount', () => {
        it(
            'should provide a count of the number of ' +
            'recent unsuccessful logins',
            () => {
                const user = {
                    id: 1
                } as any as User;

                const cutoff = new Date(Date.now() - 1000);

                const service = auditService as unknown as {
                    findCount: jest.Mock
                };

                jest.spyOn(
                    service,
                    'findCount'
                ).mockResolvedValue(1);

                expect(
                    auditService.getRecentFailedLoginCount(
                        user,
                        cutoff
                    )
                ).resolves.toBe(1);

                expect(service.findCount).toHaveBeenCalledWith({
                    where: 'user_id = :userId AND event = :event ' +
                        'AND created_at >= :cutoff',
                    params: {
                        userId: 1,
                        event: AuthEvents.INVALID_PASSWORD,
                        cutoff
                    }
                });
            }
        );
    });
});
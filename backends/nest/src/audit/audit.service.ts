import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { User } from '@/database/entities/user.entity';
import { AuditEvents } from '@/audit/audit.events';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogs: Repository<AuditLog>
    ) { }

    async getRecentFailedLoginCount(
        user: User,
        lockTimeoutMs: number
    ): Promise<number> {
        const cutoff = new Date(Date.now() - lockTimeoutMs);

        return this.auditLogs.count({
            where: {
                userId: user.id,
                event: AuditEvents.LOGIN_FAILED,
                createdAt: MoreThan(cutoff)
            }
        });
    }
}
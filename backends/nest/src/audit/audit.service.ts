import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { User } from '@/database/entities/user.entity';
import { AuthEvents } from '@/events/auth.events';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogs: Repository<AuditLog>
    ) { }

    async getRecentFailedLoginCount(
        user: User,
        cutoff: Date
    ): Promise<number> {
        return this.auditLogs.count({
            where: {
                userId: user.id,
                event: AuthEvents.INVALID_PASSWORD,
                createdAt: MoreThan(cutoff)
            }
        });
    }
}
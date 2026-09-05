import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { User } from '@/database/entities/user.entity';
import { AuthEvents } from '@/events/auth.events';
import { AbstractService } from '@/common/abstract.service';

@Injectable()
export class AuditService extends AbstractService<AuditLog> {
    constructor(
        @InjectRepository(AuditLog)
        repository: Repository<AuditLog>
    ) {
        super(repository);
    }

    async getRecentFailedLoginCount(
        user: User,
        cutoff: Date
    ): Promise<number> {
        return this.findCount({
            where: 'user_id = :userId AND event = :event ' +
                'AND created_at >= :cutoff',
            params: {
                userId: user.id,
                event: AuthEvents.INVALID_PASSWORD,
                cutoff
            }
        });
    }
}
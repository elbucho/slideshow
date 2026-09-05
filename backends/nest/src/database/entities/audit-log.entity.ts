import {
    Entity,
    Column,
    Index
} from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('audit_logs')
@Index(['userId', 'event', 'createdAt'])
export class AuditLog extends BaseEntity {
    @Column()
    userId: number;

    @Column()
    event: string;

    @Column({
        type: 'integer',
        nullable: true
    })
    sessionId: number|null;

    @Column({
        type: 'varchar',
        nullable: true
    })
    ipAddress: string|null;

    @Column({
        type: 'jsonb',
        nullable: true
    })
    data: Record<string, unknown>|null;
}
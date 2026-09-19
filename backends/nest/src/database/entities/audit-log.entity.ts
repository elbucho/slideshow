import {
    Entity,
    Column,
    Index
} from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('audit_logs')
@Index(['userId', 'event', 'createdAt'])
export class AuditLog extends BaseEntity {
    @Column({
        type: 'integer',
        name: 'user_id'
    })
    userId: number;

    @Column()
    event: string;

    @Column({
        type: 'integer',
        name: 'session_id',
        nullable: true
    })
    sessionId: number|null;

    @Column({
        type: 'varchar',
        name: 'ip_address',
        nullable: true
    })
    ipAddress: string|null;

    @Column({
        type: 'jsonb',
        nullable: true
    })
    data: Record<string, unknown>|null;
}
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index
} from 'typeorm';

@Entity('audit_logs')
@Index(['userId', 'event', 'createdAt'])
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

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

    @CreateDateColumn({
        name: 'created_at'
    })
    createdAt: Date;
}
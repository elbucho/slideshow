import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn
} from 'typeorm';

@Entity('outbox_events')
export class OutboxEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    type: string;

    @Column({ default: 'pending' })
    status: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({ default: 0 })
    attempts: number;

    @Column({
        nullable: true,
        name: 'locked_by'
    })
    lockedBy: string | null;

    @Column({
        type: 'text',
        nullable: true,
        name: 'last_error'
    })
    lastError: string | null;

    @Column({
        type: 'timestamptz',
        nullable: true,
        name: 'processed_at'
    })
    processedAt: Date | null;

    @Column({
        type: 'timestamptz',
        nullable: true,
        name: 'available_at'
    })
    availableAt: Date | null;

    @Column({
        type: 'timestamptz',
        nullable: true,
        name: 'locked_at'
    })
    lockedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
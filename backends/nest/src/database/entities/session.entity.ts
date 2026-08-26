import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('sessions')
@Index(['userId', 'ipAddress', 'userAgent'])
export class Session extends BaseEntity {
    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(
        () => User,
        (user) => user.sessions
    )
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        name: 'token_hash',
        type: 'varchar',
        unique: true,
        nullable: true
    })
    private tokenHash: string|null;

    getHashedToken(): string|null {
        return this.tokenHash;
    }

    setHashedToken(hash: string): void {
        this.tokenHash = hash;
    }

    @Column({
        name: 'token_expires_at',
        type: 'timestamptz',
        nullable: true
    })
    tokenExpiresAt: Date|null;

    @Column({
        name: 'user_agent'
    })
    userAgent: string;

    @Column({
        name: 'ip_address'
    })
    ipAddress: string;
}
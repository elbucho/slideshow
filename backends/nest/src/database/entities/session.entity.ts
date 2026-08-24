import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';
import argon2 from 'argon2';
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

    async setToken(token: string): Promise<void> {
        this.tokenHash = await argon2.hash(token);
    }

    async verifyToken(token: string): Promise<boolean> {
        if (this.tokenHash) {
            return argon2.verify(this.tokenHash, token);
        }

        return false;
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
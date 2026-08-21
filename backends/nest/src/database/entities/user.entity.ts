import {
    Column,
    Entity,
    OneToMany,
    Index
} from 'typeorm';
import argon2 from 'argon2';
import { BaseEntity } from './base.entity';
import { Session } from './session.entity';

@Entity('users')
@Index(['username'])
export class User extends BaseEntity {
    @Column({ unique: true })
    email: string;

    @Column()
    username: string;

    @Column({
        name: 'password_hash'
    })
    private passwordHash: string;

    async setPassword(password: string): Promise<void> {
        this.passwordHash = await argon2.hash(password);
    }

    async verifyPassword(password: string): Promise<boolean> {
        return argon2.verify(this.passwordHash, password);
    }

    @OneToMany(
        () => Session,
        (session) => session.user,
    )
    sessions: Session[];

    @Column({
        name: 'locked_until',
        type: 'timestamptz',
        nullable: true,
        default: null
    })
    private lockedUntil: Date|null;

    async isLockedOut(): Promise<boolean> {
        if (this.lockedUntil) {
            if (this.lockedUntil > new Date()) {
                return true;
            }

            this.lockedUntil = null;
        }

        return false;
    }

    lock(milliseconds: number): void {
        this.lockedUntil = new Date(Date.now() + milliseconds)
    }
}
import {
    Column,
    Entity
} from 'typeorm';
import argon2 from 'argon2';
import { BaseEntity } from '@/common/base.entity';

@Entity('users')
export class User extends BaseEntity {
    @Column()
    email: string;

    @Column({ name: 'password_hash', unique: true })
    private passwordHash: string;

    async setPassword(password: string): Promise<void> {
        this.passwordHash = await argon2.hash(password);
    }

    async verifyPassword(password: string): Promise<boolean> {
        return argon2.verify(this.passwordHash, password);
    }
}
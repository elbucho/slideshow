import {
    Column,
    Entity,
    OneToMany,
    Index
} from 'typeorm';
import argon2 from 'argon2';
import { BaseEntity } from './base.entity';
import { Session } from './session.entity';
import { UserState } from './user-state.entity';
import type { StateName } from '@/common/types';

@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
@Index('UQ_users_username', ['username'], { unique: true })
export class User extends BaseEntity {
    @Column()
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

    @OneToMany(
        () => UserState,
        (userState) => userState.user,
    )
    states: UserState[];

    hasState(state: StateName): boolean {
        return this.states.some(
            userState =>
                userState.state.name === state &&
                userState.isActive()
        );
    }

    setState(userState: UserState): void {
        if (!this.hasState(userState.state.name as StateName)) {
            this.states.push(userState);
        }
    }

    resolveState(state: StateName): void {
        for (const userState of this.states) {
            if (userState.state.name === state) {
                userState.resolve();

                break;
            }
        }
    }
}
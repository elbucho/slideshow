import {
    Column,
    Entity,
    OneToMany,
    Index
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Session } from './session.entity';
import { UserState } from './user-state.entity';
import { UserStateName } from '@/states/user-states.types';
import { SoftDeleteEntity } from './soft-delete.entity';

@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
@Index('UQ_users_username', ['username'], { unique: true })
export class User extends SoftDeleteEntity {
    @Column()
    email: string;

    @Column()
    username: string;

    @Column({
        name: 'password_hash'
    })
    @Exclude()
    private passwordHash: string;

    getHashedPassword(): string {
        return this.passwordHash;
    }

    setHashedPassword(hash: string): void {
        this.passwordHash = hash;
    }

    @OneToMany(
        () => Session,
        (session) => session.user,
        {
            cascade: [ 'insert', 'update' ]
        }
    )
    sessions: Session[];

    @OneToMany(
        () => UserState,
        (userState) => userState.user,
        {
            cascade: [ 'insert', 'update' ]
        }
    )
    states: UserState[];

    hasState(state: UserStateName): boolean {
        return this.states.some(
            userState =>
                userState.state.name === state &&
                userState.isActive()
        );
    }

    getState(state: UserStateName): UserState | undefined {
        return this.states.find(
            userState =>
                userState.state.name === state &&
                userState.isActive()
        );
    }

    setState(userState: UserState): void {
        if (
            !this.hasState(
                userState.state.name as UserStateName
            )
        ) {
            this.states.push(userState);
        }
    }

    resolveState(state: UserStateName): void {
        for (const userState of this.states) {
            if (userState.state.name === state) {
                userState.resolve();
            }
        }
    }
}
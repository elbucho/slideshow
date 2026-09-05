import {
    Column,
    Entity,
    ManyToOne,
    Index,
    JoinColumn
} from 'typeorm';
import { User } from './user.entity';
import { State } from './state.entity';
import { SoftDeleteEntity } from './soft-delete.entity';

@Entity('user_states')
@Index(
    'UQ_user-states_ids',
    [ 'userId', 'stateId' ],
    { unique: true}
)
export class UserState extends SoftDeleteEntity {
    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'state_id' })
    stateId: number;

    @Column({
        name: 'expires_at',
        type: 'timestamptz',
        nullable: true
    })
    expiresAt: Date|null;

    @Column({
        name: 'resolved_at',
        type: 'timestamptz',
        nullable: true
    })
    resolvedAt: Date|null;

    @Column({ type: 'jsonb', nullable: true })
    data: Record<string, unknown>|null;

    @ManyToOne(
        () => User,
        (user) => user.states
    )
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(
        () => State,
        (state) => state.userStates
    )
    @JoinColumn({ name: 'stateId' })
    state: State;

    isActive(now = new Date()): boolean {
        if (this.resolvedAt !== null) {
            return false;
        }

        return !(this.expiresAt && this.expiresAt <= now);
    }

    resolve(now = new Date()): void {
        if (this.isActive(now)) {
            this.resolvedAt = now;
        }
    }

    setHashedToken(hash: string): void {
        if (!this.data) {
            this.data = {};
        }

        this.data['tokenHash'] = hash;
    }

    getHashedToken(): string|null {
        if (this.data && this.data.tokenHash) {
            return this.data.tokenHash as string;
        }

        return null;
    }
}
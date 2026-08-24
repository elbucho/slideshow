import {
    Column,
    Entity,
    Index,
    OneToMany
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserState } from './user-state.entity';

@Entity('states')
@Index('UQ_states_name', ['name'], { unique: true })
export class State extends BaseEntity {
    @Column()
    name: string;

    @Column({ type: 'varchar', nullable: true })
    description: string|null;

    @OneToMany(
        () => UserState,
        (userState) => userState.state
    )
    userStates: UserState[]
}
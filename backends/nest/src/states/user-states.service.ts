import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserState } from '@/database/entities/user-state.entity';
import { User } from '@/database/entities/user.entity';
import { State } from '@/database/entities/state.entity';
import { ResourceNotFoundException } from '@/common/exceptions';

@Injectable()
export class UserStatesService {
    constructor(
        @InjectRepository(UserState)
        private readonly userStates: Repository<UserState>
    ) { }

    async findByUserAndState(
        user: User,
        state: State,
        includeDeleted: boolean = false
    ): Promise<UserState> {
        const userState =
            await this.userStates.findOne({
                where: {
                    userId: user.id,
                    stateId: state.id
                },
                relations: {
                    state: true
                },
                withDeleted: includeDeleted
            });

        if (!userState) {
            throw new ResourceNotFoundException(
                'user_state',
                'ids',
                {
                    userId: user.id,
                    stateId: state.id
                }
            )
        }

        return userState;
    }

    async createUserState(
        user: User,
        state: State,
        data: Record<string, unknown>|null = null,
        expiresAt: Date|null = null
    ): Promise<UserState> {
        const userState = new UserState();
        userState.userId = user.id;
        userState.stateId = state.id;
        userState.state = state;

        if (data) {
            userState.data = data;
        }

        if (expiresAt) {
            userState.expiresAt = expiresAt;
        }

        await this.save(userState);

        return userState;
    }

    async save(userState: UserState): Promise<UserState> {
        return this.userStates.save(userState);
    }
}
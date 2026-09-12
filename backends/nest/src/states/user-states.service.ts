import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserState } from '@/database/entities/user-state.entity';
import { StatesService } from './states.service';
import { CryptService } from '@/crypt/crypt.service';
import { AbstractService } from '@/common/abstract.service';
import { UserStateName } from './user-states.types';

@Injectable()
export class UserStatesService extends AbstractService<UserState>{
    constructor(
        @InjectRepository(UserState)
        repository: Repository<UserState>,

        private readonly statesService: StatesService,
        private readonly cryptService: CryptService
    ) {
        super(repository);
    }

    async findOneByUserIdAndName(
        userId: number,
        name: UserStateName
    ): Promise<UserState | null> {
        return this.findOne(
            {
                where: 'user_state.user_id = :userId ' +
                    'AND user_state_state.name = :name AND ' +
                    'user_state.resolved_at IS NULL AND ' +
                    '(user_state.expires_at IS NULL OR ' +
                    'user_state.expires_at >= NOW())',
                params: { userId, name }
            },
            {
                expand: [ 'state' ]
            }
        );
    }

    async findAllByUserIdAndNames(
        userId: number,
        names: UserStateName[]
    ): Promise<UserState[]> {
        return this.findMany(
            {
                where: 'user_state.user_id = :userId ' +
                    'AND user_state_state.name IN (:...names) AND ' +
                    'user_state.resolved_at IS NULL AND ' +
                    '(user_state.expires_at IS NULL OR ' +
                    'user_state.expires_at >= NOW())',
                params: { userId, names }
            },
            {
                expand: [ 'state' ]
            }
        );
    }

    async findOrCreate(
        userId: number,
        name: UserStateName
    ): Promise<UserState> {
        let userState =
            await this.findOneByUserIdAndName(
                userId,
                name
            );

        if (userState) return userState;

        const state =
            await this.statesService.findOrCreate(name);

        userState = new UserState();

        userState.stateId = state.id;
        userState.userId = userId;

        return this.saveWithRelations(
            userState,
            [ 'state' ]
        );
    }

    async create(
        userId: number,
        stateName: UserStateName
    ): Promise<UserState> {
        const state =
            await this.statesService.findOrCreate(
                stateName
            );

        const userState = new UserState();
        userState.userId = userId;
        userState.stateId = state.id;

        return this.save(userState);
    }

    async setToken(
        userState: UserState,
        token: string,
        timeout: Date
    ): Promise<UserState> {
        const tokenHash = await this.cryptService
            .hash(token);

        userState.setHashedToken(tokenHash);
        userState.expiresAt = timeout;

        return this.save(userState);
    }

    async resolveStates(
        userId: number,
        stateNames: UserStateName[]
    ): Promise<void> {
        const states =
            await this.findAllByUserIdAndNames(
                userId,
                stateNames
            );

        states.forEach((userState) => {
            userState.resolve();
        });

        await this.bulkSave(states);
    }
}
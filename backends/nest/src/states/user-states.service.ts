import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Raw } from 'typeorm';
import { UserState } from '@/database/entities/user-state.entity';
import { User } from '@/database/entities/user.entity';
import { State } from '@/database/entities/state.entity';
import { UserStates } from '@/states/user.states';
import { StatesService } from './states.service';
import { CryptService } from '@/crypt/crypt.service';
import { AuthContext } from '@/auth/auth-context.decorator';
import {
    AuthEvents,
    TokenMismatchEvent
} from '@/events/auth.events';
import {
    ResourceNotFoundException,
    SessionNotFoundException
} from '@/common/exceptions';

@Injectable()
export class UserStatesService {
    constructor(
        @InjectRepository(UserState)
        private readonly userStates: Repository<UserState>,
        private readonly statesService: StatesService,
        private readonly cryptService: CryptService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async findById(
        id: number,
        includeUser: boolean = false
    ): Promise<UserState> {
        let relations: Record<string, unknown> = {
            state: true
        };

        if (includeUser) {
            relations['user'] = true;
        }

        const userState = await this.userStates.findOne({
            where: {
                id,
                resolvedAt: IsNull(),
                expiresAt: Raw(
                    alias => `${alias} IS NULL OR ${alias} > NOW()`
                )
            },
            relations
        });

        if (!userState) {
            throw new ResourceNotFoundException(
                'user_state',
                'id',
                id
            );
        }

        return userState;
    }

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

    async setToken(
        userState: UserState,
        token: string,
        timeout: Date
    ): Promise<UserState> {
        userState.data = {
            tokenHash: await this.cryptService.hash(token)
        };

        userState.expiresAt = timeout;

        return this.save(userState);
    }

    async verifyTokenMatches(
        userState: UserState,
        token: string,
        context: AuthContext
    ): Promise<void> {
        const hash = userState.getHashedToken();
        const verified = hash
            ? await this.cryptService.verify(
                hash,
                token
            )
            : false;

        if (!verified) {
            await this.eventEmitter.emitAsync(
                AuthEvents.TOKEN_STATE_MISMATCH,
                new TokenMismatchEvent(
                    userState.id,
                    userState.userId,
                    context.ipAddress,
                    context.userAgent
                )
            );

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }
    }

    async resolveStates(
        user: User,
        stateNames: UserStates[]
    ): Promise<void> {
        const states =
            await this.statesService.findAllByNames(
                stateNames
            );


        states.forEach((state) => {
            user.states.forEach((userState) => {
                if (userState.stateId === state.id) {
                    userState.resolve();
                }
            })
        });

        await this.userStates.save(user.states);
    }

    async create(
        user: User,
        stateName: UserStates
    ): Promise<UserState> {
        const state =
            await this.statesService.findOrCreate(
                stateName
            );

        const userState = new UserState();
        userState.userId = user.id;
        userState.stateId = state.id;

        return this.save(userState);
    }

    async save(
        userState: UserState
    ): Promise<UserState> {
        return this.userStates.save(userState);
    }
}
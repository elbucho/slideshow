import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserState } from '@/database/entities/user-state.entity';
import { StatesService } from './states.service';
import { CryptService } from '@/crypt/crypt.service';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import {
    AuthEvents, StateNotFoundEvent,
    TokenMismatchEvent
} from '@/events/auth.events';
import {
    SessionNotFoundException
} from '@/common/exceptions';
import { AbstractService } from '@/common/abstract.service';
import { UserStateName } from './user-states.types';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';

@Injectable()
export class UserStatesService extends AbstractService<UserState>{
    constructor(
        configService: ConfigService,
        eventEmitter: EventEmitter2,

        @InjectRepository(UserState)
        repository: Repository<UserState>,

        private readonly statesService: StatesService,
        private readonly cryptService: CryptService,
    ) {
        super(
            configService,
            eventEmitter,
            repository
        );
    }

    async findByAuthUser(
        authUser: AuthUser,
        context: AuthContext,
        includeUser: boolean = false
    ): Promise<UserState> {
        let userState: UserState | null = null;

        if (authUser.sessionId) {
            userState = await this.findOne(
                {
                    where: 'user_state.user_id = :userId AND user_state.id = :sessionId',
                    params: authUser
                },
                {
                    expand: includeUser ? [ 'user' ] : undefined
                }
            );
        }

        if (!userState) {
            this.eventEmitter.emitAsync(
                AuthEvents.STATE_NOT_FOUND,
                new StateNotFoundEvent(
                    authUser.userId,
                    authUser.sessionId ?? 0,
                    context.ipAddress
                )
            ).then();

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }

        return userState;
    }

    async findOneByUserIdAndName(
        userId: number,
        name: UserStateName
    ): Promise<UserState | null> {
        return this.findOne(
            {
                where: 'user_state.user_id = :userId ' +
                    'AND state.name = :name AND ' +
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
                    'AND state.name IN :names AND ' +
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

        if (userState) {
            return userState;
        }

        const state =
            await this.statesService.findOrCreate(name);

        userState = new UserState();

        userState.stateId = state.id;
        userState.userId = userId;

        return this.save(userState);
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

        await this.repository.save(states);
    }

    async save(
        userState: UserState
    ): Promise<UserState> {
        return this.repository.save(userState);
    }
}
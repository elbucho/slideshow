import {
    Injectable,
    Inject,
    forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
    InternalServerErrorException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException
} from '@/common/exceptions';
import { User } from '@/database/entities/user.entity';
import { UserState } from '@/database/entities/user-state.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import type { StateName } from '@/common/types';
import { StatesService } from '@/states/states.service';
import { UserStatesService } from '@/states/user-states.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly users: Repository<User>,

        @Inject(forwardRef(() => StatesService))
        private readonly statesService: StatesService,

        @Inject(forwardRef(() => UserStatesService))
        private readonly userStatesService: UserStatesService
    ) { }

    async findById(
        id: number,
        includeStates: boolean = false
    ): Promise<User> {
        const relations = includeStates ?
            { states: { state: true } } :
            { };

        const user = await this.users.findOne({
            where: { id },
            relations
        });

        if (!user) {
            throw new ResourceNotFoundException(
                'user',
                'id',
                id
            );
        }

        return user;
    }

    async findByUsernameOrEmail(
        value: string,
        includeStates: boolean = false
    ): Promise<User> {
        const relations = includeStates ?
            { states: { state: true } } :
            { };

        const user = await this.users.findOne({
            where: [
                { username: value },
                { email: value }
            ],
            relations
        });

        if (!user) {
            throw new ResourceNotFoundException(
                'user',
                'username',
                value
            );
        }

        return user;
    }

    async createUser(userDto: CreateUserDto): Promise<User> {
        const user = new User();

        user.email = userDto.email;
        user.username = userDto.username;
        await user.setPassword(userDto.password);

        return this.users.save(user);
    }

    async save(user: User): Promise<User> {
        try {
            return await this.users.save(user);
        } catch (exception) {
            if (exception instanceof QueryFailedError) {
                let constraint: string = exception.driverError?.constraint ??
                    '';
                constraint = constraint.toLowerCase();
                let unique_key: string;
                let value: string;

                switch(constraint) {
                    case constraint.match(/username/)?.input:
                        unique_key = 'username';
                        value = user.username;
                        break;
                    case constraint.match(/email/)?.input:
                        unique_key = 'email';
                        value = user.email;
                        break;
                    default:
                        throw new InternalServerErrorException(
                            exception.driverError?.detail ??
                                'Internal server error',
                            {
                                trace: exception.stack
                            }
                        )
                }

                throw new ResourceAlreadyExistsException(
                    'A resource with the requested unique key already exists',
                    {
                        unique_key: unique_key,
                        value: value
                    }
                );
            }

            const message = exception.message ??
                'Internal server error';
            const details = exception.stack ?
                {
                    trace: exception.stack
                } :
                {};

            throw new InternalServerErrorException(
                message,
                details
            );
        }
    }

    async setState(
        user: User,
        stateName: StateName,
        data: Record<string, unknown>|null = null,
        expiresAt: Date|null = null
    ): Promise<User> {
        const state = await this.statesService.findOrCreate(
            stateName
        );

        let userState: UserState;

        try {
            userState = await this.userStatesService.findByUserAndState(
                user,
                state,
                true
            );

            userState.deletedAt = null;
            userState.resolvedAt = null;
            userState.expiresAt = expiresAt;
            userState.data = data;

            await this.userStatesService.save(userState);
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                userState = await this.userStatesService.createUserState(
                    user,
                    state,
                    data,
                    expiresAt
                );
            } else {
                let details: Record<string, unknown> = {};

                if (exception.stack) {
                    details['stack'] = exception.stack;
                }

                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error',
                    details
                )
            }
        }

        user.setState(userState);
        await this.save(user);

        return user;
    }

    async resolveState(
        user: User,
        state: StateName
    ): Promise<User> {
        user.resolveState(state);

        return this.users.save(user);
    }
}
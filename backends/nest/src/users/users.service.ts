import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
    InternalServerErrorException, InvalidCredentialsException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException
} from '@/common/exceptions';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import type { StateName } from '@/common/types';
import { UserStatesService } from '@/states/user-states.service';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import {
    AuthEvents,
    LockedUserLoginAttemptEvent,
    UserAccountLockedEvent,
    UserLoginFailedEvent
} from '@/events/auth.events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '@/audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { CryptService } from '@/crypt/crypt.service';
import { UserStateName } from '@/states/user-states.types';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly users: Repository<User>,
        private readonly auditService: AuditService,
        private readonly userStatesService: UserStatesService,
        private readonly cryptService: CryptService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2
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

    async verifyNotLocked(
        user: User,
        context: AuthContext
    ): Promise<void> {
        if (user.hasState('ACCOUNT_LOCKED')) {
            this.eventEmitter.emitAsync(
                AuthEvents.LOCKED_USER_LOGIN_ATTEMPT,
                new LockedUserLoginAttemptEvent(
                    user.id,
                    context.ipAddress,
                    context.userAgent
                )
            ).then();

            throw new InvalidCredentialsException(
                'Account is currently locked out'
            );
        }
    }

    async verifyPasswordMatches(
        user: User,
        password: string,
        context: AuthContext
    ): Promise<void> {
        const passwordMatches =
            await this.cryptService.verify(
                user.getHashedPassword(),
                password
            );

        if (!passwordMatches) {
            this.eventEmitter.emitAsync(
                AuthEvents.INVALID_PASSWORD,
                new UserLoginFailedEvent(
                    user.id,
                    user.email,
                    context.ipAddress,
                    context.userAgent
                )
            ).then();

            await this.checkIfShouldLock(
                user,
                context
            );

            throw new InvalidCredentialsException(
                'Invalid username or password'
            );
        }
    }

    async checkIfShouldLock(
        user: User,
        context: AuthContext
    ): Promise<void> {
        const maxFailedLogins =
            this.configService.get(
                'users.maxFailedLogins'
            );

        const lockTimeoutMs =
            this.configService.get(
                'users.lockTimeoutMs'
            );

        const cutoff = new Date(Date.now() - lockTimeoutMs);
        const lockUntil = new Date(Date.now() + lockTimeoutMs);

        const count =
            await this.auditService.getRecentFailedLoginCount(
                user,
                cutoff
            );

        if (count >= maxFailedLogins) {
            await this.lockUser(
                user,
                lockUntil,
                context
            );
        }
    }

    async lockUser(
        user: User,
        timeout: Date,
        context: AuthContext
    ): Promise<void> {
        const lockedReason =
            'Max unsuccessful login count within ' +
            'lockout period exceeded';

        this.eventEmitter.emitAsync(
            AuthEvents.USER_ACCOUNT_LOCKED,
            new UserAccountLockedEvent(
                user.id,
                context.ipAddress,
                context.userAgent,
                'AUTO',
                lockedReason
            )
        ).then();

        await this.setState(
            user,
            UserStateName.ACCOUNT_LOCKED,
            null,
            timeout
        );
    }

    async createUser(userDto: CreateUserDto): Promise<User> {
        const user = new User();
        const passwordHash = await this.cryptService.hash(
            userDto.password
        );

        user.email = userDto.email;
        user.username = userDto.username;
        user.setHashedPassword(passwordHash);

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
        stateName: UserStateName,
        data: Record<string, unknown>|null = null,
        expiresAt: Date|null = null
    ): Promise<User> {
        const userState =
            await this.userStatesService.findOrCreate(
                user.id,
                stateName
            );

        userState.expiresAt = expiresAt;
        userState.data = data;

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
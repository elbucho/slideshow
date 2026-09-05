import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvalidCredentialsException } from '@/common/exceptions';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
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
import { AbstractService } from '@/common/abstract.service';

@Injectable()
export class UsersService extends AbstractService<User> {
    constructor(
        @InjectRepository(User)
        repository: Repository<User>,

        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly auditService: AuditService,
        private readonly userStatesService: UserStatesService,
        private readonly cryptService: CryptService
    ) {
        super(repository);
    }

    async findByUsernameOrEmail(
        value: string,
        includeStates: boolean = false
    ): Promise<User> {
        return this.findOneOrFail(
            {
                where: 'username = :value OR email = :value',
                params: { value }
            },
            {
                expand: includeStates ? [ 'states' ] : undefined
            }
        )
    }

    async verifyNotLocked(
        user: User,
        context: AuthContext
    ): Promise<void> {
        if (user.hasState(UserStateName.ACCOUNT_LOCKED)) {
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

        return this.save(user);
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

        return this.saveWithRelations(
            user,
            [ 'states' ]
        );
    }

    async resolveState(
        user: User,
        state: UserStateName
    ): Promise<User> {
        user.resolveState(state);

        return this.saveWithRelations(
            user,
            [ 'states' ]
        );
    }
}
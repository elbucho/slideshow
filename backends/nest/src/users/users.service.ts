import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { AbstractService } from '@/common/abstract.service';
import { UserStateName } from '@/states/user-states.types';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';
import { InvalidCredentialsException } from '@/common/exceptions';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';

@Injectable()
export class UsersService extends AbstractService<User> {
    constructor(
        @InjectRepository(User)
        repository: Repository<User>,

        private readonly userStatesService: UserStatesService,
        private readonly cryptService: CryptService,
        private readonly sessionsService: SessionsService
    ) {
        super(repository);
    }

    async findByIdOrFail(
        id: number,
        opts?: Partial<QueryOptions>
    ): Promise<User> {
        const user = await this.findById(
            id,
            opts
        );

        if (!user) {
            throw new InvalidCredentialsException(
                'Invalid token'
            );
        }

        return user;
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
                expand: includeStates
                    ? [ 'states.state' ]
                    : undefined
            }
        )
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

    async updateUser(
        authUser: AuthUser,
        context: AuthContext,
        userDto: Partial<UpdateUserDto>
    ): Promise<User> {
        const user =
            await this.findByIdOrFail(
                authUser.userId
            );

        if (userDto.password) {
            const hash =
                await this.cryptService.hash(
                    userDto.password
                );

            user.setHashedPassword(hash);
        }

        if (userDto.email) {
            user.oldEmail = user.email;
            user.email = userDto.email;
        }

        if (userDto.username)
            user.username = userDto.username;

        const updatedUser = await this.save(user);

        const session =
            await this.sessionsService.findByAuthUser(
                authUser,
                context
            );

        await this.sessionsService.revoke(
            session,
            context,
            'AUTO',
            'User credentials updated'
        );

        return updatedUser;
    }

    async deleteUser(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<void> {
        const user = await this.findByIdOrFail(
            authUser.userId
        );

        const session =
            await this.sessionsService.findByAuthUser(
                authUser,
                context
            );

        await this.delete(user);

        await this.sessionsService.revoke(
            session,
            context,
            authUser.userId,
            'User deleted their account'
        );
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
            [ 'states.state' ]
        );
    }

    async resolveState(
        user: User,
        state: UserStateName
    ): Promise<User> {
        user.resolveState(state);

        return this.saveWithRelations(
            user,
            [ 'states.state' ]
        );
    }
}
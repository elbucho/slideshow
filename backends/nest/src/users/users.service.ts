import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { UserStateName } from '@/states/user-states.types';
import { AbstractService } from '@/common/abstract.service';

@Injectable()
export class UsersService extends AbstractService<User> {
    constructor(
        @InjectRepository(User)
        repository: Repository<User>,

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
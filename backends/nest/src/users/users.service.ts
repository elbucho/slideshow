import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '@/common/exceptions';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly users: Repository<User>
    ) {}

    async findById(id: number): Promise<User> {
        const user = await this.users.findOneBy({
            id: id
        });

        if (!user) {
            throw new ResourceNotFoundException(
                'Unable to locate the requested user',
                {
                    id: id
                }
            );
        }

        return user;
    }

    async findByUsernameOrEmail(value: string): Promise<User> {
        const user = await this.users.findOneBy([
            { username: value },
            { email: value }
        ]);

        if (!user) {
            throw new ResourceNotFoundException(
                'Unable to locate the requested user',
                {
                    search_key: value
                }
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
        return this.users.save(user);
    }
}
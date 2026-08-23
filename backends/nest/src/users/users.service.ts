import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {InternalServerErrorException, ResourceAlreadyExistsException, ResourceNotFoundException } from '@/common/exceptions';
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
}
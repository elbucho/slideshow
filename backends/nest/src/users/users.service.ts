import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '@/common/types';
import { User } from '@/database/entities/user.entity';
import {CreateUserDto} from "@/users/dtos/create-user.dto";

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

    async findByEmail(email: string): Promise<User> {
        const user = await this.users.findOneBy({
            email: email
        });

        if (!user) {
            throw new ResourceNotFoundException(
                'Unable to locate the requested user',
                {
                    email: email
                }
            );
        }

        return user;
    }

    async createUser(userDto: CreateUserDto): Promise<User> {
        const user = new User();

        user.email = userDto.email;
        await user.setPassword(userDto.password);

        return this.users.save(user);
    }
}
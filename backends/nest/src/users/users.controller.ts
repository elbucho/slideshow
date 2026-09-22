import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body
} from '@nestjs/common';
import { SkipDefaultGuard } from
        '@/auth/decorators/skip-default-guard.decorator';
import {
    type AuthContext,
    AuthContextDecorator as Context
} from '@/auth/decorators/auth-context.decorator';
import {
    type AuthUser,
    AuthUserDecorator as CurrentUser
} from '@/auth/decorators/auth-user.decorator';
import {
    QueryOptions,
    QueryOptionsDecorator as QueryOpts
} from '@/database/decorators/query-options.decorator';
import { AbstractController } from
        '@/common/abstract.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from '@/users/dtos/update-user.dto';
import { APIResponse } from '@/common/types';
import { User } from '@/database/entities/user.entity';

@Controller('user')
export class UsersController extends AbstractController {
    constructor(
        private readonly usersService: UsersService
    ) {
        super();
    }

    @Get()
    async getUser(
        @CurrentUser() authUser: AuthUser,
        @QueryOpts(
            User,
            { filter: {
                includeFields: [ 'expand' ]
            } }
        ) opts: Partial<QueryOptions>
    ): Promise<APIResponse<User>> {
        const user = await this.usersService
            .findByIdOrFail(
                authUser.userId,
                opts
            );

        return {
            type: 'success',
            code: 'RESOURCE_FETCHED',
            details: user
        };
    }

    @Post()
    @SkipDefaultGuard()
    async createUser(
        @Body() dto: CreateUserDto
    ): Promise<APIResponse<User>> {
        const user = await this.usersService
            .createUser(dto);

        return {
            type: 'success',
            code: 'RESOURCE_CREATED',
            details: user
        };
    }

    @Patch()
    async updateUser(
        @CurrentUser() authUser: AuthUser,
        @Context() context: AuthContext,
        @Body() dto: UpdateUserDto
    ): Promise<APIResponse<User>> {
        const user = await this.usersService
            .updateUser(
                authUser,
                context,
                dto
            );

        return {
            type: 'success',
            code: 'RESOURCE_UPDATED',
            details: user
        };
    }

    @Delete()
    async deleteUser(
        @CurrentUser() authUser: AuthUser,
        @Context() context: AuthContext
    ): Promise<APIResponse<{}>> {
        await this.usersService.deleteUser(
            authUser,
            context
        );

        return {
            type: 'success',
            code: 'RESOURCE_DELETED',
            details: {}
        };
    }
}
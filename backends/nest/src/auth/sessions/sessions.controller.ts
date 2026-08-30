import {
    Controller,
    UseGuards,
    Get,
    Delete,
    Body,
    Param
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsGuard } from '@/auth/guards/sessions.guard';
import {
    AuthUserDecorator as CurrentUser,
    type AuthUser
} from '@/auth/decorators/auth-user.decorator';
import {
    AuthContextDecorator as Context,
    type AuthContext
} from '@/auth/decorators/auth-context.decorator';
import {
    SkipDefaultGuard
} from '@/auth/decorators/skip-default-guard.decorator';
import { AbstractController } from '@/common/abstract.controller';
import { APIResponse, QueryResponse } from '@/common/types';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { BulkEntitiesDto } from '@/common/dtos/bulk-entities.dto';
import { EntityIdPipe } from '@/common/pipes/entity-id.pipe';
import {
    type QueryOptions,
    QueryOptionsDecorator as QueryOpts
} from '@/database/decorators/query-options.decorator';

@Controller('sessions')
export class SessionsController extends AbstractController {
    constructor(
        private readonly sessionsService: SessionsService
    ) {
        super();
    }

    @Get()
    @SkipDefaultGuard()
    @UseGuards(SessionsGuard)
    protected async getSessions(
        @CurrentUser() authUser: AuthUser,
        @QueryOpts(Session) opts: QueryOptions
    ): Promise<APIResponse<QueryResponse<Session>>> {
        const response =
            await this.sessionsService.findActiveUserSessions(
                authUser.userId,
                opts
            )

        return {
            type: 'success',
            code: 'RESOURCES_FETCHED',
            details: response
        };
    }

    @Delete()
    @SkipDefaultGuard()
    @UseGuards(SessionsGuard)
    protected async deleteSessions(
        @CurrentUser() user: AuthUser,
        @Body() bulkEntitiesDto: BulkEntitiesDto
    ): Promise<APIResponse<{ session_ids: number[] }>> {
        const userId = user instanceof User
            ? user.id
            : user.userId;

        const deletedItems =
            await this.sessionsService.deleteMany(
                userId,
                bulkEntitiesDto
            );

        return {
            type: 'success',
            code: 'RESOURCES_DELETED',
            details: {
                session_ids: deletedItems
            }
        };
    }

    @Get(':id')
    protected async getSession(
        @CurrentUser() authUser: AuthUser,
        @Context() context: AuthContext,
        @Param('id', EntityIdPipe) id: number
    ): Promise<APIResponse<Session>> {
        authUser.sessionId = id;

        const session =
            await this.sessionsService.findByAuthUser(
                authUser,
                context
            )

        return {
            type: 'success',
            code: 'RESOURCE_FETCHED',
            details: session
        };
    }

    @Delete(':id')
    protected async deleteSession(
        @CurrentUser() user: AuthUser,
        @Param('id', EntityIdPipe) id: number
    ): Promise<APIResponse<{}>> {
        await this.sessionsService.deleteOne(
            user.userId,
            id
        );

        return {
            type: 'success',
            code: 'RESOURCE_DELETED',
            details: {}
        };
    }
}


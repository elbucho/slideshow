import {
    Controller,
    UseGuards,
    Post,
    Req,
    HttpCode
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AccessGuard } from '@/auth/guards/access.guard';
import { RefreshGuard } from '@/auth/guards/refresh.guard';
import { CredentialsGuard } from '@/auth/guards/credentials.guard';
import { User } from '@/database/entities/user.entity';
import { AuthTokens } from '@/auth/dtos/tokens.dto';
import { APIResponse, type AuthContext } from '@/common/types';
import { CurrentUser } from './current-user.decorator';
import { AbstractController } from '@/common/abstract.controller';

@Controller('auth')
export class AuthController extends AbstractController {
    constructor(
        private readonly authService: AuthService
    ) {
        super();
    }

    @Post('login')
    @HttpCode(200)
    @UseGuards(CredentialsGuard)
    protected async login(
        @Req() request: Request,
        @CurrentUser() user: User
    ): Promise<APIResponse<AuthTokens>> {
        return {
            type: 'success',
            code: 'AUTHENTICATED',
            details: await this.authService.login(
                user,
                request
            )
        };
    }

    @Post('logout')
    @HttpCode(200)
    @UseGuards(AccessGuard)
    protected async logout(
        @Req() request: Request,
        @CurrentUser() context: AuthContext
    ): Promise<APIResponse<{}>> {
        await this.authService.logout(
            context.userId,
            context.sessionId,
            request
        );

        return {
            type: 'success',
            code: 'LOGGED_OUT',
            details: {}
        };
    }

    @Post('refresh')
    @HttpCode(200)
    @UseGuards(RefreshGuard)
    protected async refresh(
        @Req() request: Request,
        @CurrentUser() user: User
    ): Promise<APIResponse<AuthTokens>> {
        return {
            type: 'success',
            code: 'TOKENS_REFRESHED',
            details: await this.authService.login(
                user,
                request
            )
        };
    }
}
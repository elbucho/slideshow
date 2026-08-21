import {
    Controller,
    UseGuards,
    Post,
    Req,
    Res,
    HttpCode
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtLogoutGuard } from '@/auth/guards/jwt-logout.guard';
import { JwtRefreshAuthGuard } from '@/auth/guards/jwt-refresh-auth.guard';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AuthTokens } from '@/auth/dtos/tokens.dto';
import { APIResponse } from '@/common/types';
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
    @UseGuards(LocalAuthGuard)
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
    @UseGuards(JwtLogoutGuard)
    protected async logout(
        @Res({ passthrough: true }) response: Response,
        @CurrentUser() session: Session
    ): Promise<APIResponse<{}>> {
        await this.authService.logout(
            session,
            response
        );

        return {
            type: 'success',
            code: 'LOGGED_OUT',
            details: {}
        };
    }

    @Post('refresh')
    @HttpCode(200)
    @UseGuards(JwtRefreshAuthGuard)
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
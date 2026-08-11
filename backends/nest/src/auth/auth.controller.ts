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
import { MessageResponse } from '@/common/types';
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
        @Res({ passthrough: true }) response: Response,
        @CurrentUser() user: User
    ): Promise<MessageResponse<AuthTokens>> {
        return {
            message: 'Login successful',
            data: await this.authService.login(
                user,
                request,
                response
            )
        };
    }

    @Post('logout')
    @HttpCode(200)
    @UseGuards(JwtLogoutGuard)
    protected async logout(
        @Res({ passthrough: true }) response: Response,
        @CurrentUser() session: Session
    ): Promise<MessageResponse<{}>> {
        await this.authService.logout(
            session,
            response
        );

        return {
            message: 'Logout successful',
            data: {}
        };
    }

    @Post('refresh')
    @HttpCode(200)
    @UseGuards(JwtRefreshAuthGuard)
    protected async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
        @CurrentUser() user: User
    ): Promise<MessageResponse<AuthTokens>> {
        return {
            message: 'New auth tokens issued',
            data: await this.authService.login(
                user,
                request,
                response
            )
        };
    }
}
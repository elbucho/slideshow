import {
    Controller,
    UseGuards,
    Post,
    HttpCode
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshGuard } from '@/auth/guards/refresh.guard';
import { CredentialsGuard } from '@/auth/guards/credentials.guard';
import { SkipDefaultGuard } from
        '@/auth/decorators/skip-default-guard.decorator';
import { TokenUnion } from '@/tokens/dtos/tokens.dto';
import { APIResponse } from '@/common/types';
import { AbstractController } from '@/common/abstract.controller';
import {
    AuthUserDecorator as CurrentUser,
    type AuthUser
} from './decorators/auth-user.decorator';
import {
    AuthContextDecorator as Context,
    type AuthContext
} from './decorators/auth-context.decorator';

@Controller('auth')
export class AuthController extends AbstractController {
    constructor(
        private readonly authService: AuthService
    ) {
        super();
    }

    @Post('login')
    @HttpCode(200)
    @SkipDefaultGuard()
    @UseGuards(CredentialsGuard)
    protected async login(
        @Context() context: AuthContext,
        @CurrentUser() authUser: AuthUser
    ): Promise<APIResponse<TokenUnion>> {
        const result =
            await this.authService.login(
                authUser,
                context
            );

        return {
            type: 'success',
            code: result.code,
            details: result.payload
        }
    }

    @Post('logout')
    @HttpCode(200)
    protected async logout(
        @Context() context: AuthContext,
        @CurrentUser() user: AuthUser
    ): Promise<APIResponse<{}>> {
        await this.authService.logout(
            user,
            context
        );

        return {
            type: 'success',
            code: 'LOGGED_OUT',
            details: {}
        };
    }

    @Post('refresh')
    @HttpCode(200)
    @SkipDefaultGuard()
    @UseGuards(RefreshGuard)
    protected async refresh(
        @Context() context: AuthContext,
        @CurrentUser() authUser: AuthUser
    ): Promise<APIResponse<TokenUnion>> {
        const result =
            await this.authService.login(
                authUser,
                context
            );

        return {
            type: 'success',
            code: (result.code === 'AUTHENTICATED')
                ? 'TOKENS_REFRESHED'
                : result.code,
            details: result.payload
        };
    }
}
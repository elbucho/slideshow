import {
    Controller,
    UseGuards,
    Post,
    HttpCode
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessGuard } from '@/auth/guards/access.guard';
import { RefreshGuard } from '@/auth/guards/refresh.guard';
import { CredentialsGuard } from '@/auth/guards/credentials.guard';
import { User } from '@/database/entities/user.entity';
import { TokenUnion } from '@/tokens/dtos/tokens.dto';
import { APIResponse, LoginResult, SuccessCode} from '@/common/types';
import { AbstractController } from '@/common/abstract.controller';
import {
    AuthUserDecorator as CurrentUser,
    type AuthUser
} from './decorators/auth-user.decorator';
import {
    AuthContextDecorator as Context,
    type AuthContext
} from './decorators/auth-context.decorator';
import { InternalServerErrorException } from '@/common/exceptions';

interface ResponseUnion {
    code: SuccessCode;
    payload: TokenUnion;
}

@Controller('auth')
export class AuthController extends AbstractController {
    constructor(
        private readonly authService: AuthService
    ) {
        super();
    }

    private tokenResponse(result: LoginResult): ResponseUnion {
        let code: SuccessCode;
        let payload: TokenUnion;

        switch(result.type) {
            case 'authenticated':
                code = 'AUTHENTICATED';
                payload = result.tokens;
                break;

            case 'session_limit_exceeded':
                code = 'SESSION_LIMIT_REACHED';
                payload = result.token;
                break;

            default:
                throw new InternalServerErrorException(
                    'Invalid result type encountered'
                );
        }

        return {
            code,
            payload
        };
    }

    @Post('login')
    @HttpCode(200)
    @UseGuards(CredentialsGuard)
    protected async login(
        @Context() context: AuthContext,
        @CurrentUser() user: User
    ): Promise<APIResponse<TokenUnion>> {
        const result =
            await this.authService.login(
                user,
                context
            );

        const { code, payload } = this.tokenResponse(result);

        return {
            type: 'success',
            code: code,
            details: payload
        }
    }

    @Post('logout')
    @HttpCode(200)
    @UseGuards(AccessGuard)
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
    @UseGuards(RefreshGuard)
    protected async refresh(
        @Context() context: AuthContext,
        @CurrentUser() user: User
    ): Promise<APIResponse<TokenUnion>> {
        const result =
            await this.authService.login(
                user,
                context
            );

        const { code, payload } = this.tokenResponse(result);

        return {
            type: 'success',
            code: (code === 'AUTHENTICATED') ? 'TOKENS_REFRESHED' : code,
            details: payload
        };
    }
}
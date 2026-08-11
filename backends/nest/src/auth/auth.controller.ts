import { Controller, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { AbstractController } from '@/common/abstract.controller';
import { AuthService } from './auth.service';

type TokenResponse = {
    access_token: string;
    refresh_token: string;
}

type AuthResponses = {
    POST: TokenResponse|object
}

@Controller('auth{/*path}')
export class AuthController extends AbstractController<AuthResponses>{
    constructor(
        private readonly authService: AuthService
    ) {
        super();
    }

    protected post(
        request: Request
    ): AuthResponses['POST'] {
        const path = request.params?.['path']?.[0] ?? '';

        switch(path) {
            case 'login':
                return this.login(request);
            case 'logout':
                return this.logout(request);
            case 'refresh':
                return this.refresh(request);
            default:
                throw new NotFoundException(
                    `The requested path ${request.path} does not exist`,
                    path
                )
        }
    }

    protected login(request: Request): TokenResponse {
        this.message = JSON.stringify(request.query);

        return {
            access_token: 'asdf',
            refresh_token: 'fdsa'
        }
    }

    protected logout(request: Request): object {
        return {};
    }

    protected refresh(request: Request): TokenResponse {
        return {
            access_token: 'asdf',
            refresh_token: 'fdsa'
        }
    }
}
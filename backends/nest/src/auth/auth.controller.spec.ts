import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthController } from '@/auth/auth.controller';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AuthTokens } from '@/auth/dtos/tokens.dto';

describe('AuthController', () => {
    let authService: jest.Mocked<AuthService>;
    let authController: AuthController;

    beforeAll(() => {
        authService = {
            login: jest.fn(),
            logout: jest.fn()
        } as any as jest.Mocked<AuthService>;

        authController = new AuthController(authService);
    });

    describe('login', () => {
        it('should log the user in', () => {
            const authTokens = {
                access_token: 'access-token',
                refresh_token: 'refresh-token'
            } as AuthTokens;

            const request = {} as any as Request;
            const user = {} as any as User;

            authService.login.mockResolvedValue(authTokens);

            expect(
                authController['login'](
                    request,
                    user
                )
            ).resolves.toStrictEqual({
                type: 'success',
                code: 'AUTHENTICATED',
                details: authTokens
            });
        });
    });

    describe('logout', () => {
        it('should log the user out', async () => {
            const session = {} as any as Session;

            await expect(
                authController['logout'](
                    session
                )
            ).resolves.toStrictEqual({
                type: 'success',
                code: 'LOGGED_OUT',
                details: {}
            });

            expect(authService.logout).toHaveBeenCalledWith(
                session
            );
        });
    });

    describe('refresh', () => {
        it('should refresh the user\'s tokens', async () => {
            const request = {} as any as Request;
            const user = {} as any as User;
            const authTokens = {
                access_token: 'access-token',
                refresh_token: 'refresh-token'
            } as AuthTokens;

            authService.login.mockResolvedValue(authTokens);

            await expect(
                authController['refresh'](
                    request,
                    user
                )
            ).resolves.toStrictEqual({
                type: 'success',
                code: 'TOKENS_REFRESHED',
                details: authTokens
            });

            expect(authService.login).toHaveBeenCalledWith(
                user,
                request
            );
        });
    });
});
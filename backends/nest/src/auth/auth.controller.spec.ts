import { AuthService } from './auth.service';
import { AuthController } from '@/auth/auth.controller';
import { User } from '@/database/entities/user.entity';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { LoginResult } from '@/common/types';
import { assertAuthenticated } from '@test/helpers/auth';

describe('AuthController', () => {
    let authService: jest.Mocked<AuthService>;
    let authController: AuthController;
    let loginResult: LoginResult;
    let context: AuthContext;
    let user: User;
    let authUser: AuthUser;

    beforeAll(() => {
        authService = {
            login: jest.fn(),
            logout: jest.fn()
        } as any as jest.Mocked<AuthService>;

        authController = new AuthController(authService);

        loginResult = {
            type: 'authenticated',
            tokens: {
                access_token: 'access-token',
                refresh_token: 'refresh-token'
            }
        };

        context = {
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0'
        };

        user = {} as any as User;
        authUser = {} as any as AuthUser;
    });

    describe('login', () => {
        it('should log the user in', () => {
            assertAuthenticated(loginResult);
            authService.login.mockResolvedValue(loginResult);

            expect(
                authController['login'](
                    context,
                    user
                )
            ).resolves.toStrictEqual({
                type: 'success',
                code: 'AUTHENTICATED',
                details: loginResult.tokens
            });
        });
    });

    describe('logout', () => {
        it('should log the user out', async () => {
            await expect(
                authController['logout'](
                    context,
                    authUser
                )
            ).resolves.toStrictEqual({
                type: 'success',
                code: 'LOGGED_OUT',
                details: {}
            });

            expect(authService.logout).toHaveBeenCalledWith(
                authUser,
                context
            );
        });
    });

    describe('refresh', () => {
        it('should refresh the user\'s tokens', async () => {
            assertAuthenticated(loginResult);
            authService.login.mockResolvedValue(loginResult);

            await expect(
                authController['refresh'](
                    context,
                    user
                )
            ).resolves.toStrictEqual({
                type: 'success',
                code: 'TOKENS_REFRESHED',
                details: loginResult.tokens
            });

            expect(authService.login).toHaveBeenCalledWith(
                context,
                user
            );
        });
    });
});
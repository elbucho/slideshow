import { AuthService } from './auth.service';
import { AuthController } from '@/auth/auth.controller';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import {
    AuthenticatedResponse,
    SessionLimitResponse
} from '@/auth/types';

describe('AuthController', () => {
    let authService: jest.Mocked<AuthService>;
    let authController: AuthController;

    const loginResult = {
        code: 'AUTHENTICATED',
        payload: {
            access_token: 'access-token',
            refresh_token: 'refresh-token'
        }
    } as AuthenticatedResponse;

    const sessionsExceededResult = {
        code: 'SESSION_LIMIT_REACHED',
        payload: {
            temporary_token: 'temp-token',
            sessions: []
        }
    } as SessionLimitResponse;

    const context = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
    } as AuthContext;

    const authUser = {} as any as AuthUser;

    beforeEach(() => {
        authService = {
            login: jest.fn(),
            logout: jest.fn()
        } as any as jest.Mocked<AuthService>;

        authController = new AuthController(authService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    })

    describe('login', () => {
        it(
            'should log the user in',
            async () => {
                authService.login
                    .mockResolvedValue(loginResult);

                await expect(
                    authController['login'](
                        context,
                        authUser
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'AUTHENTICATED',
                    details: loginResult.payload
                });
            }
        );

        it(
            'should return a SESSION_LIMIT_REACHED ' +
            'response with a temporary token if the user ' +
            'has too many active sessions',
            async () => {
                authService.login
                    .mockResolvedValue(sessionsExceededResult);

                await expect(
                    authController['login'](
                        context,
                        authUser
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'SESSION_LIMIT_REACHED',
                    details: {
                        temporary_token: 'temp-token',
                        sessions: []
                    }
                });
            }
        );
    });

    describe('logout', () => {
        it(
            'should log the user out',
            async () => {
                await expect(
                    authController['logout'](
                        context,
                        authUser
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'LOGGED_OUT',
                    details: {}
                });

                expect(authService.logout)
                    .toHaveBeenCalledWith(
                        authUser,
                        context
                    );
            }
        );
    });

    describe('refresh', () => {
        it(
            'should refresh the user\'s tokens',
            async () => {
                authService.login
                    .mockResolvedValue(loginResult);

                await expect(
                    authController['refresh'](
                        context,
                        authUser
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'TOKENS_REFRESHED',
                    details: loginResult.payload
                });

                expect(authService.login)
                    .toHaveBeenCalledWith(
                        authUser,
                        context
                    );
            }
        );

        it(
            'should return a different code than ' +
            'TOKENS_REFRESHED if tokenResponse does not ' +
            'return a code of AUTHENTICATED',
            async () => {
                authService.login
                    .mockResolvedValue(sessionsExceededResult);

                await expect(
                    authController['refresh'](
                        context,
                        authUser
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'SESSION_LIMIT_REACHED',
                    details: {
                        temporary_token: 'temp-token',
                        sessions: []
                    }
                });
            }
        );
    });
});
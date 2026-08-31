import { UsersService } from '@/users/users.service';
import { SessionsService } from './sessions/sessions.service';
import { UserStatesService } from '@/states/user-states.service';
import { TokensService } from '@/tokens/tokens.service';
import { AuthService } from './auth.service';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { LoginResult } from '@/common/types';
import { UserStateName } from '@/states/user-states.types';
import { Session } from '@/database/entities/session.entity';
import {User} from "@/database/entities/user.entity";
import {UserState} from "@/database/entities/user-state.entity";

describe('AuthService', () => {
    let authService: AuthService;

    const usersService = {
        findByUsernameOrEmail: jest.fn(),
        verifyNotLocked: jest.fn(),
        verifyPasswordMatches: jest.fn()
    } as any as UsersService;

    const sessionsService = {
        findCurrentUserSession: jest.fn(),
        findActiveUserSessions: jest.fn(),
        findByAuthUser: jest.fn(),
        checkIfSessionLimitExceeded: jest.fn(),
        verifyTokenMatches: jest.fn(),
        verifyNotExpired: jest.fn(),
        create: jest.fn(),
        terminate: jest.fn()
    } as any as SessionsService;

    const userStatesService = {
        findByAuthUser: jest.fn(),
        verifyTokenMatches: jest.fn(),
        resolveStates: jest.fn()
    } as any as UserStatesService;

    const tokensService = {
        createSessionLimitToken: jest.fn(),
        createAuthTokens: jest.fn()
    } as any as TokensService;

    const authUser = {
        userId: 1,
        sessionId: 123
    } as AuthUser;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    const tokenExpiresAt = new Date(
        Date.now() + 60 * 1000
    );

    const user = {
        id: authUser.userId
    } as any as User;

    const session = {
        id: authUser.sessionId,
        userId: authUser.userId,
        ipAddress: authContext.ipAddress,
        userAgent: authContext.userAgent,
        tokenExpiresAt,
        user
    } as any as Session;


    beforeEach(() => {
        authService = new AuthService(
            usersService,
            sessionsService,
            userStatesService,
            tokensService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        const loginSuccess = {
            type: 'authenticated',
            tokens: {
                access_token: 'test-access',
                refresh_token: 'test-refresh'
            }
        } as LoginResult;

        const loginSessionsExceeded = {
            type: 'session_limit_exceeded',
            token: {
                temporary_token: 'test-temp'
            },
            sessions: [
                session
            ]
        } as LoginResult;

        it(
            'should refresh the tokens and return an ' +
            'existing session if one is found',
            async () => {
                jest.spyOn(
                    sessionsService,
                    'findCurrentUserSession'
                ).mockResolvedValue(session);

                jest.spyOn(
                    tokensService,
                    'createAuthTokens'
                ).mockResolvedValue(loginSuccess);

                await expect(
                    authService.login(
                        authUser,
                        authContext
                    )
                ).resolves.toBe(loginSuccess);

                expect(sessionsService.findCurrentUserSession)
                    .toHaveBeenCalledWith(
                        authUser,
                        authContext
                    );

                expect(tokensService.createAuthTokens)
                    .toHaveBeenCalledWith(
                        session
                    );
            }
        );

        describe('No active session found', () => {
            beforeEach(() => {
                jest.spyOn(
                    sessionsService,
                    'findCurrentUserSession'
                ).mockResolvedValue(null);

                jest.spyOn(
                    sessionsService,
                    'findActiveUserSessions'
                ).mockResolvedValue({
                    items: [ session ],
                    total: 1
                });
            });

            afterEach(() => {
                expect(sessionsService.findActiveUserSessions)
                    .toHaveBeenCalledWith(
                        1
                    );

                expect(sessionsService.checkIfSessionLimitExceeded)
                    .toHaveBeenCalledWith(
                        1,
                        1,
                        authContext
                    );
            });

            it(
                'should find the current active user session ' +
                'based on the user ID and the AuthContext object',
                async () => {
                    jest.spyOn(
                        sessionsService,
                        'checkIfSessionLimitExceeded'
                    ).mockResolvedValue(false);

                    jest.spyOn(
                        sessionsService,
                        'create'
                    ).mockResolvedValue(session);

                    jest.spyOn(
                        tokensService,
                        'createAuthTokens'
                    ).mockResolvedValue(loginSuccess);

                    await expect(
                        authService.login(
                            {
                                userId: 1
                            },
                            authContext
                        )
                    ).resolves.toBe(loginSuccess);

                    expect(sessionsService.create)
                        .toHaveBeenCalledWith(
                            1,
                            authContext
                        );

                    expect(tokensService.createAuthTokens)
                        .toHaveBeenCalledWith(
                            session
                        );
                }
            );

            it(
                'should create a session limit token if ' +
                'the user has exceeded the maximum number ' +
                'of sessions',
                async () => {
                    jest.spyOn(
                        sessionsService,
                        'checkIfSessionLimitExceeded'
                    ).mockResolvedValue(true);

                    jest.spyOn(
                        userStatesService,
                        'resolveStates'
                    );

                    jest.spyOn(
                        tokensService,
                        'createSessionLimitToken'
                    ).mockResolvedValue(loginSessionsExceeded);

                    await expect(
                        authService.login(
                            {
                                userId: 1
                            },
                            authContext
                        )
                    ).resolves.toBe(loginSessionsExceeded);

                    expect(userStatesService.resolveStates)
                        .toHaveBeenCalledWith(
                            1,
                            [ UserStateName.SESSION_LIMIT_EXCEEDED ]
                        );

                    expect(tokensService.createSessionLimitToken)
                        .toHaveBeenCalledWith(
                            1,
                            [ session ],
                            authContext
                        );
                }
            );
        });
    });

    describe('logout', () => {
        it(
            'should call sessionsService.terminate',
            async () => {
                jest.spyOn(
                    sessionsService,
                    'terminate'
                );

                await authService.logout(
                    authUser,
                    authContext
                );

                expect(sessionsService.terminate)
                    .toHaveBeenCalledWith(
                        authUser,
                        authContext
                    );
            }
        );
    });

    describe('authenticateCredentials', () => {
        it(
            'should find a user in the db and verify ' +
            'that the password matches and that the ' +
            'account is not locked',
            async () => {
                const user = {
                    id: 1
                } as any as User;

                jest.spyOn(
                    usersService,
                    'findByUsernameOrEmail'
                ).mockResolvedValue(user);

                jest.spyOn(
                    usersService,
                    'verifyPasswordMatches'
                );

                jest.spyOn(
                    usersService,
                    'verifyNotLocked'
                );

                await expect(
                    authService.authenticateCredentials(
                        'test-user',
                        'test-password',
                        authContext
                    )
                ).resolves.toEqual({
                    userId: user.id
                });

                expect(usersService.verifyPasswordMatches)
                    .toHaveBeenCalledWith(
                        user,
                        'test-password',
                        authContext
                    );

                expect(usersService.verifyNotLocked)
                    .toHaveBeenCalledWith(
                        user,
                        authContext
                    );
            }
        );
    });

    describe('authenticateRefreshToken', () => {
        it(
            'should find a session in the db and verify ' +
            'that the provided refresh token matches',
            async () => {
                const token = 'test-token';

                jest.spyOn(
                    sessionsService,
                    'findByAuthUser'
                ).mockResolvedValue(session);

                jest.spyOn(
                    sessionsService,
                    'verifyTokenMatches'
                );

                jest.spyOn(
                    sessionsService,
                    'verifyNotExpired'
                );

                jest.spyOn(
                    usersService,
                    'verifyNotLocked'
                );

                await expect(
                    authService.authenticateRefreshToken(
                        token,
                        authUser,
                        authContext
                    )
                ).resolves.toEqual(authUser);

                expect(sessionsService.findByAuthUser)
                    .toHaveBeenCalledWith(
                        authUser,
                        authContext,
                        true
                    );

                expect(sessionsService.verifyTokenMatches)
                    .toHaveBeenCalledWith(
                        session,
                        token,
                        authContext
                    );

                expect(sessionsService.verifyNotExpired)
                    .toHaveBeenCalledWith(
                        session,
                        authContext
                    );

                expect(usersService.verifyNotLocked)
                    .toHaveBeenCalledWith(
                        user,
                        authContext
                    );
            }
        );
    });

    describe('authenticateTemporaryToken', () => {
        it(
            'should locate the userState associated with ' +
            'the temporary token and verify that the hash ' +
            'stored on that record matches the token string',
            async () => {
                const token = 'test-token';

                const userState = {
                    id: 123,
                    userId: 1,
                    user
                } as any as UserState;

                jest.spyOn(
                    userStatesService,
                    'findByAuthUser'
                ).mockResolvedValue(userState);

                jest.spyOn(
                    userStatesService,
                    'verifyTokenMatches'
                );

                jest.spyOn(
                    usersService,
                    'verifyNotLocked'
                );

                await expect(
                    authService.authenticateTemporaryToken(
                        token,
                        authUser,
                        authContext
                    )
                ).resolves.toEqual(authUser);

                expect(userStatesService.findByAuthUser)
                    .toHaveBeenCalledWith(
                        authUser,
                        authContext,
                        true
                    );

                expect(userStatesService.verifyTokenMatches)
                    .toHaveBeenCalledWith(
                        userState,
                        token,
                        authContext
                    );

                expect(usersService.verifyNotLocked)
                    .toHaveBeenCalledWith(
                        user,
                        authContext
                    );
            }
        );
    });
});
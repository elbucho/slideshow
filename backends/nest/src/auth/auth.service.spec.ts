import { SessionsService } from './sessions/sessions.service';
import { UserStatesService } from '@/states/user-states.service';
import { TokensService } from '@/tokens/tokens.service';
import { AuthService } from './auth.service';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { UserStateName } from '@/states/user-states.types';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';
import {
    AuthenticatedResponse,
    SessionLimitResponse
} from '@/auth/types';
import {defaultQueryOptions} from "@/database/decorators/query-options.decorator";

describe('AuthService', () => {
    let authService: AuthService;

    const sessionsService = {
        markLastActive: jest.fn(),
        findCurrentUserSession: jest.fn(),
        findActiveUserSessions: jest.fn(),
        checkIfSessionLimitReached: jest.fn(),
        create: jest.fn(),
        terminate: jest.fn()
    } as any as SessionsService;

    const userStatesService = {
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
            code: 'AUTHENTICATED',
            payload: {
                access_token: 'test-access',
                refresh_token: 'test-refresh'
            }
        } as AuthenticatedResponse;

        const loginSessionsReached = {
            code: 'SESSION_LIMIT_REACHED',
            payload: {
                temporary_token: 'test-temp',
                sessions: [
                    session
                ]
            }
        } as SessionLimitResponse;

        it(
            'should refresh the tokens and return an ' +
            'existing session if one is found',
            async () => {
                jest.spyOn(
                    sessionsService,
                    'findCurrentUserSession'
                ).mockResolvedValue(session);

                const lastActiveAtAdded = {
                    ...session,
                    lastActiveAt: new Date()
                } as any as Session;

                jest.spyOn(
                    sessionsService,
                    'markLastActive'
                ).mockResolvedValue(
                    lastActiveAtAdded
                )

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
                        lastActiveAtAdded
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
                    page: 1,
                    pageSize: defaultQueryOptions.pageSize,
                    totalPages: 1
                });
            });

            afterEach(() => {
                expect(sessionsService.findActiveUserSessions)
                    .toHaveBeenCalledWith(
                        {
                            userId: 1
                        }
                    );

                expect(sessionsService.checkIfSessionLimitReached)
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
                        'checkIfSessionLimitReached'
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
                'the user has reached the maximum number ' +
                'of sessions',
                async () => {
                    jest.spyOn(
                        sessionsService,
                        'checkIfSessionLimitReached'
                    ).mockResolvedValue(true);

                    jest.spyOn(
                        userStatesService,
                        'resolveStates'
                    );

                    jest.spyOn(
                        tokensService,
                        'createSessionLimitToken'
                    ).mockResolvedValue(loginSessionsReached);

                    await expect(
                        authService.login(
                            {
                                userId: 1
                            },
                            authContext
                        )
                    ).resolves.toBe(loginSessionsReached);

                    expect(userStatesService.resolveStates)
                        .toHaveBeenCalledWith(
                            1,
                            [ UserStateName.SESSION_LIMIT_REACHED ]
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
});
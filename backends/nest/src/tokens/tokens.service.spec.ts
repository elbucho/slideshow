import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UserStatesService } from '@/states/user-states.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { TokensService } from './tokens.service';
import { Session } from '@/database/entities/session.entity';
import { UserState } from '@/database/entities/user-state.entity';
import {
    AuthEvents,
    TempTokenGrantedEvent,
    UserLoggedInEvent
} from '@/events/auth.events';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';

describe('TokensService', () => {
    let sessionsService: SessionsService;
    let userStatesService: UserStatesService;
    let configService: ConfigService;
    let eventEmitter: EventEmitter2;
    let jwtService: JwtService;
    let tokensService: TokensService;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    beforeEach(() => {
        sessionsService = {
            setToken: jest.fn()
        } as any as SessionsService;

        userStatesService = {
            create: jest.fn(),
            setToken: jest.fn()
        } as any as UserStatesService;

        configService = {
            get: jest.fn()
        } as any as ConfigService;

        eventEmitter = {
            emitAsync: jest.fn().mockResolvedValue(true)
        } as any as EventEmitter2;

        jwtService = {
            sign: jest.fn()
        } as any as JwtService;

        tokensService = new TokensService(
            sessionsService,
            userStatesService,
            configService,
            eventEmitter,
            jwtService
        );
    });

    afterEach(() => {
        jest.clearAllMocks()
    });

    describe('createAuthTokens', () => {
        it(
            'creates auth and refresh tokens, ' +
            'sets a hash of the refresh token into the ' +
            'session object, emits a LOGGED_IN event, and returns ' +
            'a LoginResult object containing the tokens',
            async () => {
                jest.spyOn(
                    tokensService,
                    'createAuthToken'
                ).mockImplementation(
                    (type, _) => `${type}-test`
                );

                jest.spyOn(
                    configService,
                    'get'
                ).mockReturnValue(1000);

                const session = {
                    id: 1,
                    userId: 1,
                    ipAddress: '127.0.0.1',
                    userAgent: 'test-agent'
                } as any as Session;

                jest.spyOn(
                    sessionsService,
                    'setToken'
                ).mockResolvedValue(session);

                await expect(
                    tokensService.createAuthTokens(
                        session
                    )
                ).resolves.toEqual({
                    type: 'authenticated',
                    tokens: {
                        access_token: 'access-test',
                        refresh_token: 'refresh-test'
                    }
                });

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.LOGGED_IN,
                        new UserLoggedInEvent(
                            1,
                            1,
                            '127.0.0.1',
                            'test-agent'
                        )
                    );
            }
        );
    });

    describe('createSessionLimitToken', () => {
        it(
            'should create a new session limit token to ' +
            'give the user a brief window to delete excess ' +
            'active sessions for their account. It should emit ' +
            'a TEMP_TOKEN_GRANTED event',
            async () => {
                const userState = {
                    id: 1,
                    userId: 1,
                    stateId: 1
                } as any as UserState;

                jest.spyOn(
                    tokensService,
                    'createTempToken'
                ).mockReturnValue('temp-test');

                jest.spyOn(
                    configService,
                    'get'
                ).mockReturnValue(10000);

                jest.spyOn(
                    userStatesService,
                    'setToken'
                ).mockResolvedValue(userState);

                const sessions = [
                    new Session(),
                    new Session()
                ];

                await expect(
                    tokensService.createSessionLimitToken(
                        1,
                        sessions,
                        authContext
                    )
                ).resolves.toEqual({
                    type: 'session_limit_exceeded',
                    token: {
                        temporary_token: 'temp-test'
                    },
                    sessions
                });

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.TEMP_TOKEN_GRANTED,
                        new TempTokenGrantedEvent(
                            1,
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );
    });

    describe('createAuthToken', () => {
        const session = {
            id: 1,
            userId: 1
        } as any as Session;

        it(
            'should create an access token that contains ' +
            'the session id and user id in its payload',
            () => {
                jest.spyOn(
                    configService,
                    'get'
                )
                    .mockReturnValueOnce('access-secret')
                    .mockReturnValueOnce(10000);

                jest.spyOn(
                    jwtService,
                    'sign'
                ).mockReturnValue('test-token');

                expect(
                    tokensService.createAuthToken(
                        'access',
                        session
                    )
                ).toEqual('test-token');

                expect(jwtService.sign)
                    .toHaveBeenCalledWith(
                        {
                            sub: 1,
                            sid: 1,
                            type: 'access'
                        },
                        {
                            secret: 'access-secret',
                            expiresIn: '10000ms'
                        }
                    );
            }
        );

        it(
            'should create a refresh token that contains ' +
            'the session id and user id in its payload, as ' +
            'well as a random UUID for jwtid',
            () => {
                jest.spyOn(
                    configService,
                    'get'
                )
                    .mockReturnValueOnce('refresh-secret')
                    .mockReturnValueOnce(10000);

                jest.spyOn(
                    jwtService,
                    'sign'
                ).mockReturnValue('test-token');

                expect(
                    tokensService.createAuthToken(
                        'refresh',
                        session
                    )
                ).toEqual('test-token');

                expect(jwtService.sign)
                    .toHaveBeenCalledWith(
                        {
                            sub: 1,
                            sid: 1,
                            type: 'refresh'
                        },
                        {
                            secret: 'refresh-secret',
                            expiresIn: '10000ms',
                            jwtid: expect.any(String)
                        }
                    );
            }
        );
    });

    describe('createTempToken', () => {
        it(
            'should create a temporary token that contains ' +
            'the userState id and user id in its payload, as ' +
            'well as a random UUID for jwtid',
            () => {
                jest.spyOn(
                    configService,
                    'get'
                )
                    .mockReturnValueOnce('temp-secret')
                    .mockReturnValueOnce(10000);

                jest.spyOn(
                    jwtService,
                    'sign'
                ).mockReturnValue('test-token');

                const userState = {
                    id: 1,
                    userId: 1
                } as any as UserState;

                expect(
                    tokensService.createTempToken(
                        userState
                    )
                ).toEqual('test-token');

                expect(jwtService.sign)
                    .toHaveBeenCalledWith(
                        {
                            sub: 1,
                            sid: 1,
                            type: 'temp'
                        },
                        {
                            secret: 'temp-secret',
                            expiresIn: '10000ms',
                            jwtid: expect.any(String)
                        }
                    );

            }
        );
    });
});
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    createMockQueryBuilder,
    QueryBuilderFactory
} from '@/database/queries/query.builder';
import { SecurityService } from './security.service';
import { CryptService } from '@/crypt/crypt.service';
import { UserStatesService } from '@/states/user-states.service';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';
import { UserState } from '@/database/entities/user-state.entity';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { BaseEntity } from '@/database/entities/base.entity';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { UserStateName } from '@/states/user-states.types';
import {
    InvalidCredentialsException,
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import {
    AuthEvents,
    LockedUserLoginAttemptEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent,
    StateNotFoundEvent,
    TokenMismatchEvent,
    UserAccountLockedEvent,
    UserLoginFailedEvent,
    UserNotFoundEvent
} from '@/events/auth.events';

function getMockRepository<
    T extends BaseEntity
>(): Repository<T> {
    return {
        save: jest.fn()
    } as any as Repository<T>
}

describe('SecurityService', () => {
    let service: SecurityService;
    let sessionsRepository: Repository<Session>;
    let usersRepository: Repository<User>;
    let userStatesRepository: Repository<UserState>;
    let auditLogsRepository: Repository<AuditLog>;

    let sessionsBuilder: ReturnType<
        typeof createMockQueryBuilder
    >;
    let usersBuilder: ReturnType<
        typeof createMockQueryBuilder
    >;
    let userStatesBuilder: ReturnType<
        typeof createMockQueryBuilder
    >;
    let auditLogsBuilder: ReturnType<
        typeof createMockQueryBuilder
    >;

    let mockFactory: QueryBuilderFactory;
    let eventEmitter: EventEmitter2;
    let configService: ConfigService;
    let cryptService: CryptService;
    let userStatesService: UserStatesService;

    let user: User;
    let session: Session;
    let userState: UserState;

    const authUser = {
        userId: 1,
        sessionId: 1
    } as AuthUser;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    beforeEach(async () => {
        sessionsRepository = getMockRepository<Session>();
        usersRepository = getMockRepository<User>();
        userStatesRepository = getMockRepository<UserState>();
        auditLogsRepository = getMockRepository<AuditLog>();

        sessionsBuilder = createMockQueryBuilder();
        usersBuilder = createMockQueryBuilder();
        userStatesBuilder = createMockQueryBuilder();
        auditLogsBuilder = createMockQueryBuilder();

        // return the right fake depending on which
        // repo/alias was passed in
        mockFactory = {
            create: jest.fn(
                (_, alias) => {
                    switch (alias) {
                        case 'user': return usersBuilder;
                        case 'session': return sessionsBuilder;
                        case 'user_state': return userStatesBuilder;
                        case 'audit_log': return auditLogsBuilder;
                    }
                }
            ),
        } as unknown as QueryBuilderFactory;

        configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        eventEmitter = {
            emitAsync: jest.fn().mockReturnValue(null)
        } as any as jest.Mocked<EventEmitter2>;

        cryptService = {
            verify: jest.fn()
        } as any as jest.Mocked<CryptService>;

        userStatesService = {
            findOrCreate: jest.fn()
        } as any as jest.Mocked<UserStatesService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SecurityService,
                { provide: QueryBuilderFactory, useValue: mockFactory },
                {
                    provide: getRepositoryToken(Session),
                    useValue: sessionsRepository
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: usersRepository
                },
                {
                    provide: getRepositoryToken(UserState),
                    useValue: userStatesRepository
                },
                {
                    provide: getRepositoryToken(AuditLog),
                    useValue: auditLogsRepository
                },
                { provide: ConfigService, useValue: configService },
                { provide: EventEmitter2, useValue: eventEmitter },
                { provide: CryptService, useValue: cryptService },
                { provide: UserStatesService, useValue: userStatesService }
            ],
        }).compile();

        service = module.get(SecurityService);

        user = {
            id: 1,
            username: 'test-user',
            email: 'test@example.com',
            getHashedPassword: jest.fn()
                .mockReturnValue('test-hash'),
            hasState: jest.fn(),
            setState: jest.fn()
        } as any as User;

        session = {
            id: 1,
            userId: 1,
            user: user,
            tokenExpiresAt: new Date(
                Date.now() + 10000
            ),
            getHashedToken: jest.fn()
                .mockReturnValue('test-hash')
        } as any as Session;

        userState = {
            id: 1,
            userId: 1,
            stateId: 1,
            user: user,
            getHashedToken: jest.fn()
                .mockReturnValue('test-hash')
        } as any as UserState;
    });

    afterEach(() => {
        jest.clearAllMocks()
    });

    describe('verifyCredentials', () => {
        beforeEach(() => {
            jest.spyOn(
                usersBuilder,
                'getOne'
            ).mockResolvedValue(user);

            jest.spyOn(
                cryptService,
                'verify'
            ).mockResolvedValue(true);

            jest.spyOn(
                user,
                'hasState'
            ).mockReturnValue(false);

            jest.spyOn(
                sessionsBuilder,
                'getOne'
            ).mockResolvedValue(session);
        });

        it(
            'should locate the user in the database, ' +
            'verify that the password is correct, ' +
            'verify that the user is not currently locked, ' +
            'determine whether the user has an active session, ' +
            'and return an AuthUser object',
            async () => {
                await expect(
                    service.verifyCredentials(
                        'test-user',
                        'test-pass',
                        authContext
                    )
                ).resolves.toEqual(authUser);

                expect(usersBuilder.where)
                    .toHaveBeenCalledWith(
                        'user.username = :username ' +
                        'OR user.email = :username',
                        {
                            username: 'test-user'
                        }
                    );

                expect(usersBuilder.addOptions)
                    .toHaveBeenCalledWith({
                        expand: [ 'states.state' ]
                    });

                expect(cryptService.verify)
                    .toHaveBeenCalledWith(
                        'test-hash',
                        'test-pass'
                    );

                expect(user.hasState)
                    .toHaveBeenCalledWith(
                        UserStateName.ACCOUNT_LOCKED
                    );

                expect(sessionsBuilder.where)
                    .toHaveBeenCalledWith(
                        'session.user_id = :userId ' +
                        'AND session.user_agent = :userAgent ' +
                        'AND session.ip_address = :ipAddress',
                        {
                            userId: 1,
                            ...authContext
                        }
                    );

                expect(sessionsBuilder.addOptions)
                    .toHaveBeenCalledWith({
                        expand: [
                            'user.states.state'
                        ]
                    });
            }
        );

        it(
            'should return an AuthUser object with ' +
            'the sessionId undefined if no matching ' +
            'active session is found',
            async () => {
                jest.spyOn(
                    sessionsBuilder,
                    'getOne'
                ).mockResolvedValue(null);

                await expect(
                    service.verifyCredentials(
                        'test-user',
                        'test-pass',
                        authContext
                    )
                ).resolves.toEqual({
                    userId: 1
                });
            }
        );

        it(
            'should emit a USER_NOT_FOUND event and ' +
            'throw an InvalidCredentialsException if the ' +
            'user is not located in the database',
            async () => {
                jest.spyOn(
                    usersBuilder,
                    'getOne'
                ).mockResolvedValue(null);

                await expect(
                    service.verifyCredentials(
                        'test-user',
                        'test-pass',
                        authContext
                    )
                ).rejects.toThrow(
                    new InvalidCredentialsException(
                        'Invalid username or password'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.USER_NOT_FOUND,
                        new UserNotFoundEvent(
                            'test-user',
                            authContext.ipAddress
                        )
                    );
            }
        );

        describe('Password doesn\'t match', () => {
            beforeEach(() => {
                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(false);

                jest.spyOn(
                    configService,
                    'get'
                ).mockReturnValueOnce(3)
                .mockReturnValue(10000);
            });

            it(
                'should emit an INVALID_PASSWORD event and ' +
                'throw an InvalidCredentialsException if the ' +
                'password doesn\'t match. Additionally, it should ' +
                'check if the user account needs to be locked',
                async () => {
                    jest.spyOn(
                        auditLogsBuilder,
                        'getCount'
                    ).mockResolvedValue(1);

                    await expect(
                        service.verifyCredentials(
                            'test-user',
                            'test-pass',
                            authContext
                        )
                    ).rejects.toThrow(
                        new InvalidCredentialsException(
                            'Invalid username or password'
                        )
                    );

                    expect(eventEmitter.emitAsync)
                        .toHaveBeenCalledWith(
                            AuthEvents.INVALID_PASSWORD,
                            new UserLoginFailedEvent(
                                1,
                                'test@example.com',
                                authContext.ipAddress,
                                authContext.userAgent
                            )
                        );
                }
            );

            it(
                'should lock the user account if the ' +
                'number of failed logins matches or exceeds ' +
                'users.maxFailedLogins',
                async () => {
                    jest.spyOn(
                        auditLogsBuilder,
                        'getCount'
                    ).mockResolvedValue(3);

                    const state = {
                        id: 1,
                        userId: 1,
                        stateId: 1,
                        expiresAt: null
                    } as any as UserState;

                    jest.spyOn(
                        userStatesService,
                        'findOrCreate'
                    ).mockResolvedValue(state);

                    await expect(
                        service.verifyCredentials(
                            'test-user',
                            'test-pass',
                            authContext
                        )
                    ).rejects.toThrow(
                        new InvalidCredentialsException(
                            'Invalid username or password'
                        )
                    );

                    expect(userStatesService.findOrCreate)
                        .toHaveBeenCalledWith(
                            1,
                            UserStateName.ACCOUNT_LOCKED
                        );

                    expect(user.setState)
                        .toHaveBeenCalledWith({
                            ...state,
                            expiresAt: expect.any(Date)
                        });

                    expect(usersRepository.save)
                        .toHaveBeenCalledWith(user);

                    expect(eventEmitter.emitAsync)
                        .toHaveBeenLastCalledWith(
                            AuthEvents.USER_ACCOUNT_LOCKED,
                            new UserAccountLockedEvent(
                                1,
                                authContext.ipAddress,
                                authContext.userAgent,
                                'AUTO',
                                'Max unsuccessful login count ' +
                                'within lockout period exceeded'
                            )
                        );
                }
            );
        });

        it(
            'should emit a LOCKED_USER_LOGIN_ATTEMPT event ' +
            'and throw an InvalidCredentialsException if the ' +
            'user account is locked',
            async () => {
                jest.spyOn(
                    user,
                    'hasState'
                ).mockReturnValue(true);

                await expect(
                    service.verifyCredentials(
                        'test-user',
                        'test-pass',
                        authContext
                    )
                ).rejects.toThrow(
                    new InvalidCredentialsException(
                        'Account is currently locked out'
                    )
                );

                expect(user.hasState)
                    .toHaveBeenCalledWith(
                        UserStateName.ACCOUNT_LOCKED
                    );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenLastCalledWith(
                        AuthEvents.LOCKED_USER_LOGIN_ATTEMPT,
                        new LockedUserLoginAttemptEvent(
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );
    });

    describe('verifyRefreshToken', () => {
        beforeEach(() => {
            jest.spyOn(
                sessionsBuilder,
                'getOne'
            ).mockResolvedValue(session);

            jest.spyOn(
                cryptService,
                'verify'
            ).mockResolvedValue(true);

            jest.spyOn(
                user,
                'hasState'
            ).mockReturnValue(false);
        });

        it(
            'should locate the session in the database, ' +
            'verify that the hashedToken matches, ' +
            'verify that the session isn\'t expired, ' +
            'verify that the user is not currently locked, ' +
            'and return an AuthUser object',
            async () => {
                await expect(
                    service.verifyRefreshToken(
                        'test-token',
                        authUser,
                        authContext
                    )
                ).resolves.toEqual(authUser);

                expect(sessionsBuilder.where)
                    .toHaveBeenCalledWith(
                        'session.user_id = :userId ' +
                        'AND session.id = :sessionId',
                        authUser
                    );

                expect(sessionsBuilder.addOptions)
                    .toHaveBeenCalledWith({
                        expand: [
                            'user.states.state'
                        ]
                    });

                expect(cryptService.verify)
                    .toHaveBeenCalledWith(
                        'test-hash',
                        'test-token'
                    );

                expect(user.hasState)
                    .toHaveBeenCalledWith(
                        UserStateName.ACCOUNT_LOCKED
                    );
            }
        );

        it(
            'should emit a SESSION_NOT_FOUND event and ' +
            'throw a SessionNotFoundException if no session ' +
            'was located in the database',
            async () => {
                jest.spyOn(
                    sessionsBuilder,
                    'getOne'
                ).mockResolvedValueOnce(null);

                await expect(
                    service.verifyRefreshToken(
                        'test-token',
                        authUser,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.SESSION_NOT_FOUND,
                        new SessionNotFoundEvent(
                            1,
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );

        it(
            'should emit a TOKEN_SESSION_MISMATCH event ' +
            'and throw a SessionNotFoundException if the ' +
            'tokenHash stored in the session doesn\'t match ' +
            'the passed token',
            async () => {
                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValueOnce(false);

                await expect(
                    service.verifyRefreshToken(
                        'test-token',
                        authUser,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.TOKEN_SESSION_MISMATCH,
                        new TokenMismatchEvent(
                            1,
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );

        it(
            'should also throw a SessionNotFoundException ' +
            'if the session has an empty tokenHash',
            async () => {
                jest.spyOn(
                    session,
                    'getHashedToken'
                ).mockReturnValueOnce(null);

                await expect(
                    service.verifyRefreshToken(
                        'test-token',
                        authUser,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );
            }
        );

        it(
            'should emit a SESSION_TOKEN_EXPIRED event and ' +
            'throw a SessionExpiredException if ' +
            'session.tokenExpiresAt <= Date.now',
            async () => {
                session.tokenExpiresAt = new Date(
                    Date.now()
                );

                await expect(
                    service.verifyRefreshToken(
                        'test-token',
                        authUser,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionExpiredException(
                        'Session expired',
                        {
                            tokenExpiredAt: session.tokenExpiresAt
                        }
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.SESSION_TOKEN_EXPIRED,
                        new SessionTokenExpiredEvent(
                            'refresh',
                            1,
                            1,
                            session.tokenExpiresAt,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );

        it(
            'should emit a LOCKED_USER_LOGIN_ATTEMPT ' +
            'event and throw an InvalidCredentialsException ' +
            'if the user account is locked',
            async () => {
                jest.spyOn(
                    user,
                    'hasState'
                ).mockReturnValue(true);

                await expect(
                    service.verifyRefreshToken(
                        'test-token',
                        authUser,
                        authContext
                    )
                ).rejects.toThrow(
                    new InvalidCredentialsException(
                        'Account is currently locked out'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.LOCKED_USER_LOGIN_ATTEMPT,
                        new LockedUserLoginAttemptEvent(
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );
    });

    describe('verifyTemporaryToken', () => {
        beforeEach(() => {
            jest.spyOn(
                userStatesBuilder,
                'getOne'
            ).mockResolvedValue(userState);

            jest.spyOn(
                cryptService,
                'verify'
            ).mockResolvedValue(true);

            jest.spyOn(
                user,
                'hasState'
            ).mockReturnValue(false);
        });

        it(
            'should locate the user_state in the database, ' +
            'verify that the hashedToken matches, ' +
            'verify that the user is not currently locked, ' +
            'and return an AuthUser object',
            async () => {
                await expect(
                    service.verifyTemporaryToken(
                        'test-token',
                        1,
                        1,
                        authContext
                    )
                ).resolves.toEqual({
                    userId: 1
                });

                expect(userStatesBuilder.where)
                    .toHaveBeenCalledWith(
                        'user_state.id = :userStateId AND ' +
                        'user_state.user_id = :userId',
                        {
                            userId: 1,
                            userStateId: 1
                        }
                    );

                expect(userStatesBuilder.addOptions)
                    .toHaveBeenCalledWith({
                        expand: [ 'user' ]
                    });

                expect(cryptService.verify)
                    .toHaveBeenCalledWith(
                        'test-hash',
                        'test-token'
                    );

                expect(user.hasState)
                    .toHaveBeenCalledWith(
                        UserStateName.ACCOUNT_LOCKED
                    );
            }
        );

        it(
            'should emit a STATE_NOT_FOUND event and ' +
            'throw a SessionNotFoundException if the ' +
            'database can\'t locate the UserState',
            async () => {
                jest.spyOn(
                    userStatesBuilder,
                    'getOne'
                ).mockResolvedValueOnce(null);

                await expect(
                    service.verifyTemporaryToken(
                        'test-token',
                        1,
                        1,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.STATE_NOT_FOUND,
                        new StateNotFoundEvent(
                            1,
                            1,
                            authContext.ipAddress
                        )
                    );
            }
        );

        it(
            'should emit a TOKEN_STATE_MISMATCH event ' +
            'and throw a SessionNotFoundException if ' +
            'the tokenHash doesn\'t match the token',
            async () => {
                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValueOnce(false);

                await expect(
                    service.verifyTemporaryToken(
                        'test-token',
                        1,
                        1,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.TOKEN_STATE_MISMATCH,
                        new TokenMismatchEvent(
                            1,
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );

        it(
            'should also throw a SessionNotFoundException ' +
            'if the UserState has an empty tokenHash',
            async () => {
                jest.spyOn(
                    userState,
                    'getHashedToken'
                ).mockReturnValueOnce(null);

                await expect(
                    service.verifyTemporaryToken(
                        'test-token',
                        1,
                        1,
                        authContext
                    )
                ).rejects.toThrow(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );
            }
        );

        it(
            'should emit a LOCKED_USER_LOGIN_ATTEMPT ' +
            'event and throw an InvalidCredentialsException ' +
            'if the user account is locked',
            async () => {
                jest.spyOn(
                    user,
                    'hasState'
                ).mockReturnValue(true);

                await expect(
                    service.verifyTemporaryToken(
                        'test-token',
                        1,
                        1,
                        authContext
                    )
                ).rejects.toThrow(
                    new InvalidCredentialsException(
                        'Account is currently locked out'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.LOCKED_USER_LOGIN_ATTEMPT,
                        new LockedUserLoginAttemptEvent(
                            1,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );
    });
});
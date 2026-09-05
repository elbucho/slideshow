import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { CryptService } from '@/crypt/crypt.service';
import { SessionsService } from './sessions.service';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';
import {
    AuthEvents,
    SessionLimitExceededEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent,
    TokenMismatchEvent,
    UserLoggedOutEvent
} from '@/events/auth.events';
import {
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';
import { QueryResponse } from '@/common/types';

describe('SessionsService', () => {
    let sessionsService: SessionsService;

    const configService = {
        get: jest.fn()
    } as any as ConfigService;

    const eventEmitter = {
        emitAsync: jest.fn().mockResolvedValue([])
    } as any as EventEmitter2;

    const cryptService = {
        hash: jest.fn(),
        verify: jest.fn()
    } as any as CryptService;

    const repository = {
        save: jest.fn(),
        softRemove: jest.fn(),
        softDelete: jest.fn(),
        find: jest.fn(),
        metadata: {
            name: 'Session'
        }
    } as any as jest.Mocked<Repository<Session>>;

    const authUser = {
        userId: 1,
        sessionId: 1
    } as AuthUser;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    const session = {
        id: authUser.sessionId,
        userId: authUser.userId,
        ipAddress: authContext.ipAddress,
        userAgent: authContext.userAgent,
        setHashedToken: jest.fn(),
        getHashedToken: jest.fn()
    } as any as Session;

    beforeEach(() => {
        sessionsService = new SessionsService(
            repository,
            configService,
            eventEmitter,
            cryptService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findActiveUserSessions', () => {
        it(
            'should find all active sessions belonging ' +
            'to the logged-in user',
            async () => {
                const opts = {} as any as QueryOptions;

                const response = {
                    items: [ session ],
                    total: 1
                } as QueryResponse<Session>;

                const service = sessionsService as unknown as {
                    findManyWithCount: jest.Mock;
                }

                const findManyWithCount = jest.spyOn(
                    service,
                    'findManyWithCount'
                ) as jest.Mock;

                findManyWithCount.mockResolvedValue(
                    response
                );

                await expect(
                    sessionsService.findActiveUserSessions(
                        1,
                        opts
                    )
                ).resolves.toEqual(response);

                expect(findManyWithCount)
                    .toHaveBeenCalledWith(
                        {
                            where: 'session.user_id = :userId',
                            params: { userId: 1 }
                        },
                        opts
                    );
            }
        );
    });

    describe('findCurrentUserSession', () => {
        let findOne: jest.Mock;

        const authUserWhere = 'session.user_id = :userId ' +
            'AND session.id = :sessionId';

        const authContextWhere = 'session.user_id = :userId ' +
                'AND session.user_agent = :userAgent AND ' +
                'session.ip_address = :ipAddress';

        beforeEach(() => {
            const service = sessionsService as unknown as {
                findOne: jest.Mock;
            }

            findOne = jest.spyOn(
                service,
                'findOne'
            ) as jest.Mock;
        });

        it(
            'should return the session associated with ' +
            'the userId and sessionId fields in AuthUser',
            async () => {
                findOne.mockResolvedValue(session);

                await expect(
                    sessionsService.findCurrentUserSession(
                        authUser,
                        authContext
                    )
                ).resolves.toEqual(session);

                expect(findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: authUserWhere,
                            params: authUser
                        },
                        {
                            expand: [ 'user' ]
                        }
                    );
            }
        );

        it(
            'should return null if the session doesn\'t exist',
            async () => {
                findOne.mockResolvedValue(null);

                await expect(
                    sessionsService.findCurrentUserSession(
                        authUser,
                        authContext
                    )
                ).resolves.toEqual(null);

                expect(findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: authUserWhere,
                            params: authUser
                        },
                        {
                            expand: [ 'user' ]
                        }
                    );
            }
        );

        it(
            'should return the session associated with ' +
            'the userId and the authContext when the sessionId ' +
            'field is not available in AuthUser',
            async () => {
                findOne.mockResolvedValue(session);

                await expect(
                    sessionsService.findCurrentUserSession(
                        {
                            userId: 1
                        },
                        authContext
                    )
                ).resolves.toEqual(session);

                expect(findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: authContextWhere,
                            params: {
                                userId: 1,
                                ...authContext
                            }
                        },
                        {
                            expand: [ 'user' ]
                        }
                    );
            }
        );
    });

    describe('findByAuthUser', () => {
        let findOne: jest.Mock;

        beforeEach(() => {
            const service = sessionsService as unknown as {
                findOne: jest.Mock;
            }

            findOne = jest.spyOn(
                service,
                'findOne'
            ) as jest.Mock;
        });

        it(
            'should return the session associated with ' +
            'an AuthUser object',
            async () => {
                findOne.mockResolvedValue(session);

                await expect(
                    sessionsService.findByAuthUser(
                        authUser,
                        authContext
                    )
                ).resolves.toEqual(session);

                expect(findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: 'session.user_id = :userId AND ' +
                                'session.id = :sessionId',
                            params: authUser
                        },
                        {
                            expand: undefined
                        }
                    );
            }
        );

        it(
            'should expand the user relation when ' +
            'includeUser is set to true',
            async () => {
                const user = {
                    id: 1
                } as any as User;

                const sessionWithUser = {
                    ...session,
                    user
                };

                findOne.mockResolvedValue(sessionWithUser);

                await expect(
                    sessionsService.findByAuthUser(
                        authUser,
                        authContext,
                        true
                    )
                ).resolves.toEqual(sessionWithUser);

                expect(findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: 'session.user_id = :userId AND ' +
                                'session.id = :sessionId',
                            params: authUser
                        },
                        {
                            expand: [ 'user' ]
                        }
                    );

            }
        );

        it(
            'should throw a SessionNotFoundException and ' +
            'emit a SessionNotFoundEvent when findOne returns null',
            async () => {
                findOne.mockResolvedValue(null);

                await expect(
                    sessionsService.findByAuthUser(
                        authUser,
                        authContext
                    )
                ).rejects.toStrictEqual(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.SESSION_NOT_FOUND,
                        new SessionNotFoundEvent(
                            authUser.userId,
                            authUser.sessionId!,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );
    });

    describe('checkIfSessionLimitExceeded', () => {
        beforeEach(() => {
            jest.spyOn(
                configService,
                'get'
            ).mockReturnValue(5);
        })

        it(
            'should return false if the config value ' +
            'users.maxActiveSessions is greater than the ' +
            'activeSessions value passed to the method.',
            async () => {
                await expect(
                    sessionsService.checkIfSessionLimitExceeded(
                        1,
                        3,
                        authContext
                    )
                ).resolves.toBe(false);
            }
        );

        it(
            'should return true and emit a ' +
            'SESSION_LIMIT_EXCEEDED event when activeSessions ' +
            'is greater than or equal to users.maxActiveSessions',
            async () => {
                await expect(
                    sessionsService.checkIfSessionLimitExceeded(
                        1,
                        6,
                        authContext
                    )
                ).resolves.toBe(true);

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.SESSION_LIMIT_EXCEEDED,
                        new SessionLimitExceededEvent(
                            1,
                            authContext.ipAddress,
                            authContext.userAgent,
                            6,
                            5
                        )
                    );
            }
        );
    });

    describe('setToken', () => {
        it(
            'should create a hash from a token, then ' +
            'set that hash in the session along with its ' +
            'expiration date',
            async () => {
                jest.spyOn(
                    cryptService,
                    'hash'
                ).mockResolvedValue('test-hash');

                jest.spyOn(
                    session,
                    'setHashedToken'
                );

                const expiresAt = new Date(
                    Date.now() + 1000
                );

                const updatedSession = {
                    ...session,
                    tokenExpiresAt: expiresAt
                } as any as Session;

                jest.spyOn(
                    sessionsService,
                    'save'
                ).mockResolvedValue(updatedSession);

                await expect(
                    sessionsService.setToken(
                        session,
                        'test-token',
                        expiresAt
                    )
                ).resolves.toEqual(updatedSession);

                expect(cryptService.hash)
                    .toHaveBeenCalledWith('test-token');

                expect(session.setHashedToken)
                    .toHaveBeenCalledWith('test-hash');

                expect(sessionsService.save)
                    .toHaveBeenCalledWith(updatedSession);
            }
        );
    });

    describe('verifyTokenMatches', () => {
        const tokenMismatchEvent = new TokenMismatchEvent(
            session.id,
            session.userId,
            authContext.ipAddress,
            authContext.userAgent
        );

        it(
            'should return void if the provided token ' +
            'matches the hash stored in the database',
            async () => {
                jest.spyOn(
                    session,
                    'getHashedToken'
                ).mockReturnValue('test-hash');

                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(true);

                await sessionsService.verifyTokenMatches(
                    session,
                    'test-token',
                    authContext
                );

                expect(session.getHashedToken)
                    .toHaveBeenCalledTimes(1);

                expect(cryptService.verify)
                    .toHaveBeenCalledWith(
                        'test-hash',
                        'test-token'
                    );
            }
        );

        it(
            'should throw a SessionNotFoundException and ' +
            'emit a TOKEN_SESSION_MISMATCH event if the ' +
            'tokenHash value is not set on the session',
            async () => {
                jest.spyOn(
                    session,
                    'getHashedToken'
                ).mockReturnValue(null);

                await expect(
                    sessionsService.verifyTokenMatches(
                        session,
                        'test-token',
                        authContext
                    )
                ).rejects.toEqual(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.TOKEN_SESSION_MISMATCH,
                        tokenMismatchEvent
                    );
            }
        );

        it(
            'should throw a SessionNotFoundException and ' +
            'emit a TOKEN_SESSION_MISMATCH event if the ' +
            'tokenHash value doesn\'t match the passed token',
            async () => {
                jest.spyOn(
                    session,
                    'getHashedToken'
                ).mockReturnValue('test-hash');

                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(false);

                await expect(
                    sessionsService.verifyTokenMatches(
                        session,
                        'test-token',
                        authContext
                    )
                ).rejects.toEqual(
                    new SessionNotFoundException(
                        'Invalid token'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.TOKEN_SESSION_MISMATCH,
                        tokenMismatchEvent
                    );
            }
        );
    });

    describe('verifyNotExpired', () => {
        it(
            'should return void if the session ' +
            'doesn\'t contain a tokenExpiresAt value',
            async () => {
                await sessionsService.verifyNotExpired(
                    session,
                    authContext
                );
            }
        );

        it(
            'should return void if the session ' +
            'contains a tokenExpiresAt value, but it ' +
            'is set in the future',
            async () => {
                await sessionsService.verifyNotExpired(
                    {
                        ...session,
                        tokenExpiresAt: new Date(
                            Date.now() + 10000
                        )
                    } as any as Session,
                    authContext
                );
            }
        );

        it(
            'should throw a SessionExpiredException ' +
            'and emit a SESSION_TOKEN_EXPIRED event if ' +
            'the tokenExpiresAt is set to a past date',
            async () => {
                const tokenExpiresAt = new Date(
                    Date.now() - 10000
                );

                await expect(
                    sessionsService.verifyNotExpired(
                        {
                            ...session,
                            tokenExpiresAt
                        } as any as Session,
                        authContext
                    )
                ).rejects.toEqual(
                    new SessionExpiredException(
                        'Session expired',
                        {
                            'token_expired_at':
                            tokenExpiresAt
                        }
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.SESSION_TOKEN_EXPIRED,
                        new SessionTokenExpiredEvent(
                            'refresh',
                            session.id,
                            session.userId,
                            tokenExpiresAt,
                            authContext.ipAddress,
                            authContext.userAgent
                        )
                    );
            }
        );
    });

    describe('create', () => {
        it(
            'should create a new session',
            async () => {
                const tempSession = {
                    userId: 1,
                    ...authContext
                } as any as Session;

                const savedSession = {
                    ...tempSession,
                    id: 1
                } as any as Session;

                jest.spyOn(
                    sessionsService,
                    'save'
                ).mockResolvedValue(savedSession);

                await expect(
                    sessionsService.create(
                        1,
                        authContext
                    )
                ).resolves.toEqual(savedSession);

                expect(sessionsService.save)
                    .toHaveBeenCalledWith(tempSession);
            }
        );
    });

    describe('terminate', () => {
        it(
            'should end early and return false ' +
            'if AuthUser doesn\'t contain a sessionId',
            async () => {
                await expect(
                    sessionsService.terminate(
                        {
                            userId: 1
                        },
                        authContext
                    )
                ).resolves.toBe(false);
            }
        );

        it(
            'should emit a LOGGED_OUT, then soft delete ' +
            'the session associated with the AuthUser object',
            async () => {
                jest.spyOn(
                    sessionsService,
                    'findByAuthUser'
                ).mockResolvedValue(session);

                jest.spyOn(
                    sessionsService,
                    'delete'
                ).mockResolvedValue(true);

                await expect(
                    sessionsService.terminate(
                        authUser,
                        authContext
                    )
                ).resolves.toBe(true);

                expect(sessionsService.findByAuthUser)
                    .toHaveBeenCalledWith(
                        authUser,
                        authContext
                    );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.LOGGED_OUT,
                        new UserLoggedOutEvent(
                            session.userId,
                            session.id
                        )
                    );

                expect(sessionsService.delete)
                    .toHaveBeenCalledWith(session);
            }
        );
    });

    describe('deleteOne', () => {
        it(
            'should soft delete the session associated ' +
            'with the provided userId and sessionId',
            async () => {
                const service = sessionsService as unknown as {
                    deleteWhere: jest.Mock;
                };

                jest.spyOn(
                    service,
                    'deleteWhere'
                ).mockResolvedValue(true);

                await expect(
                    sessionsService.deleteOne(
                        1,
                        1
                    )
                ).resolves.toBe(true);

                expect(service.deleteWhere)
                    .toHaveBeenCalledWith({
                        where: 'session.user_id = :userId ' +
                            'AND session.id = :sessionId',
                        params: {
                            userId: 1,
                            sessionId: 1
                        }
                    });
            }
        );
    });

    describe('deleteMany', () => {
        it(
            'should soft delete an array of session ids ' +
            'that are associated with a given userId, and ' +
            'return the array of deleted IDs',
            async () => {
                const service = sessionsService as unknown as {
                    bulkDelete: jest.Mock;
                };

                jest.spyOn(
                    service,
                    'bulkDelete'
                ).mockResolvedValue({
                    foundIds: [ 1, 2, 3, 4],
                    deletedIds: [ 1, 3, 4 ]
                });

                await expect(
                    sessionsService.deleteMany(
                        1,
                        {
                            ids: [ 1, 2, 3, 4 ]
                        }
                    )
                ).resolves.toEqual([
                    1, 3, 4
                ]);

                expect(service.bulkDelete)
                    .toHaveBeenCalledWith({
                        where: 'session.user_id = :userId ' +
                            'AND session.id IN :ids',
                        params: {
                            userId: 1,
                            ids: [ 1, 2, 3, 4 ]
                        }
                    });
            }
        );
    });
});
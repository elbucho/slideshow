import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { UserState } from
        '@/database/entities/user-state.entity';
import { User } from
        '@/database/entities/user.entity';
import { State } from
        '@/database/entities/state.entity';
import { StatesService } from './states.service';
import { CryptService } from '@/crypt/crypt.service';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import {
    AuthEvents,
    StateNotFoundEvent,
    TokenMismatchEvent
} from '@/events/auth.events';
import {
    SessionNotFoundException
} from '@/common/exceptions';
import { UserStateName } from './user-states.types';
import { UserStatesService } from './user-states.service';

describe('UserStatesService', () => {
    let eventEmitter: EventEmitter2;
    let repository: Repository<UserState>;
    let statesService: StatesService;
    let cryptService: CryptService;
    let userStatesService: UserStatesService;

    const authUser = {
        userId: 1,
        sessionId: 1
    } as AuthUser;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    beforeEach(() => {
        eventEmitter = {
            emitAsync: jest.fn().mockResolvedValue(true)
        } as any as EventEmitter2;

        repository = {
            metadata: {
                name: 'UserState'
            }
        } as any as Repository<UserState>;

        statesService = {
            findOrCreate: jest.fn()
        } as any as StatesService;

        cryptService = {
            hash: jest.fn(),
            verify: jest.fn()
        } as any as CryptService;

        userStatesService = new UserStatesService(
            repository,
            eventEmitter,
            statesService,
            cryptService
        );
    });

    describe('findByAuthUser', () => {
        let service: {
            findOne: jest.Mock
        };

        beforeEach(() => {
            service = userStatesService as unknown as {
                findOne: jest.Mock
            };
        });

        it(
            'should find a UserState record by ' +
            'an AuthUser object that has been overloaded ' +
            'to include the UserState.id as the sessionId',
            async () => {
                const userState = {
                    id: 1,
                    user_id: 1
                } as any as UserState;

                jest.spyOn(
                    service,
                    'findOne'
                ).mockResolvedValue(userState);

                await expect(
                    userStatesService.findByAuthUser(
                        authUser,
                        authContext,
                        false
                    )
                ).resolves.toBe(userState);

                expect(service.findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: 'user_state.user_id = :userId ' +
                                'AND user_state.id = :sessionId',
                            params: authUser
                        },
                        {
                            expand: undefined
                        }
                    );
            }
        );

        it(
            'should hydrate the user relationship if ' +
            'includeUser is set to true',
            async () => {
                const userState = {
                    id: 1,
                    user_id: 1,
                    user: { id: 1 } as any as User
                } as any as UserState;

                jest.spyOn(
                    service,
                    'findOne'
                ).mockResolvedValue(userState);

                await expect(
                    userStatesService.findByAuthUser(
                        authUser,
                        authContext,
                        true
                    )
                ).resolves.toBe(userState);

                expect(service.findOne)
                    .toHaveBeenCalledWith(
                        {
                            where: 'user_state.user_id = :userId ' +
                                'AND user_state.id = :sessionId',
                            params: authUser
                        },
                        {
                            expand: [ 'user' ]
                        }
                    );
            }
        );

        it(
            'should throw a SessionNotFound exception ' +
            'if no UserState record was found',
            async () => {
                jest.spyOn(
                    service,
                    'findOne'
                ).mockResolvedValue(null);

                await expect(
                    userStatesService.findByAuthUser(
                        authUser,
                        authContext,
                        true
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
                            authUser.userId,
                            authUser.sessionId!,
                            authContext.ipAddress
                        )
                    );
            }
        );

        it(
            'should throw a SessionNotFound exception ' +
            'if the authUser object doesn\'t contain sessionId',
            async () => {
                await expect(
                    userStatesService.findByAuthUser(
                        {
                            userId: 1
                        },
                        authContext,
                        true
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
                            authUser.userId,
                            0,
                            authContext.ipAddress
                        )
                    );
            }
        );
    });

    describe('findOneByUserIdAndName', () => {
        it(
            'should call findOne to locate a ' +
            'UserState object matching the userId and stateName',
            async () => {
                const service = userStatesService as unknown as {
                    findOne: jest.Mock
                };

                const userState = {
                    id: 1,
                    userId: 1,
                    stateId: 1
                } as any as UserState;

                jest.spyOn(
                    service,
                    'findOne'
                ).mockResolvedValue(userState);

                await expect(
                    userStatesService.findOneByUserIdAndName(
                        1,
                        UserStateName.ACCOUNT_LOCKED
                    )
                ).resolves.toBe(userState);
            }
        );
    });

    describe('findAllByUserIdAndNames', () => {
        it(
            'should call findMany to locate ' +
            'UserState objects matching the userId and stateName',
            async () => {
                const service = userStatesService as unknown as {
                    findMany: jest.Mock
                };

                const userState1 = {
                    id: 1,
                    userId: 1,
                    stateId: 1
                } as any as UserState;

                const userState2 = {
                    id: 2,
                    userId: 1,
                    stateId: 2
                }

                jest.spyOn(
                    service,
                    'findMany'
                ).mockResolvedValue([
                    userState1,
                    userState2
                ]);

                await expect(
                    userStatesService.findAllByUserIdAndNames(
                        1,
                        [
                            UserStateName.ACCOUNT_LOCKED,
                            UserStateName.SESSION_LIMIT_EXCEEDED
                        ]
                    )
                ).resolves.toEqual([
                    userState1,
                    userState2
                ]);
            }
        );
    });

    describe('findOrCreate', () => {
        it(
            'should return a UserState object from the ' +
            'db if the criteria matches at least one record',
            async () => {
                const userState = {
                    id: 1,
                    userId: 1,
                    stateId: 1
                } as any as UserState;

                jest.spyOn(
                    userStatesService,
                    'findOneByUserIdAndName'
                ).mockResolvedValue(userState);

                await expect(
                    userStatesService.findOrCreate(
                        1,
                        UserStateName.ACCOUNT_LOCKED
                    )
                ).resolves.toBe(userState);

                expect(userStatesService.findOneByUserIdAndName)
                    .toHaveBeenCalledWith(
                        1,
                        UserStateName.ACCOUNT_LOCKED
                    );
            }
        );

        it(
            'should create a new UserState record ' +
            'if one matching the criteria doesn\'t exist',
            async () => {
                jest.spyOn(
                    userStatesService,
                    'findOneByUserIdAndName'
                ).mockResolvedValue(null);

                const state = {
                    id: 1,
                    name: UserStateName.ACCOUNT_LOCKED
                } as any as State;

                jest.spyOn(
                    statesService,
                    'findOrCreate'
                ).mockResolvedValue(state);

                const userState = {
                    id: 1,
                    stateId: 1,
                    userId: 1
                } as any as UserState;

                const service = userStatesService as unknown as {
                    saveWithRelations: jest.Mock
                };

                jest.spyOn(
                    service,
                    'saveWithRelations'
                ).mockResolvedValue(userState);

                await expect(
                    userStatesService.findOrCreate(
                        1,
                        UserStateName.ACCOUNT_LOCKED
                    )
                ).resolves.toBe(userState);
            }
        )
    });

    describe('create', () => {
        it(
            'should take in a userId and stateName ' +
            'and create a new UserState object',
            async () => {
                const state = {
                    id: 1,
                    name: UserStateName.ACCOUNT_LOCKED
                } as any as State;

                jest.spyOn(
                    statesService,
                    'findOrCreate'
                ).mockResolvedValue(state);

                const userState = {
                    id: 1,
                    stateId: 1,
                    userId: 1
                } as any as UserState;

                jest.spyOn(
                    userStatesService,
                    'save'
                ).mockResolvedValue(userState);

                await expect(
                    userStatesService.create(
                        1,
                        UserStateName.ACCOUNT_LOCKED
                    )
                ).resolves.toBe(userState);
            }
        );
    });

    describe('setToken', () => {
        it(
            'should hash a provided token and ' +
            'set it and the timeout into the userState ' +
            'object via the setHashedToken function',
            async () => {
                const timeout = new Date(
                    Date.now() + 10000
                );

                const userState = {
                    id: 1,
                    userId: 1,
                    stateId: 1,
                    setHashedToken: jest.fn()
                } as any as UserState;

                const savedUserState = {
                    ...userState,
                    expiresAt: timeout
                } as any as UserState;

                jest.spyOn(
                    cryptService,
                    'hash'
                ).mockResolvedValue('test-hash');

                jest.spyOn(
                    userStatesService,
                    'save'
                ).mockResolvedValue(savedUserState);

                await expect(
                    userStatesService.setToken(
                        userState,
                        'test-token',
                        timeout
                    )
                ).resolves.toBe(savedUserState);

                expect(cryptService.hash)
                    .toHaveBeenCalledWith('test-token');

                expect(userState.setHashedToken)
                    .toHaveBeenCalledWith('test-hash');

                expect(userStatesService.save)
                    .toHaveBeenCalledWith({
                        ...userState,
                        expiresAt: timeout
                    });
            }
        );
    });

    describe('verifyTokenMatches', () => {
        let userState: UserState;

        beforeEach(() => {
            userState = {
                id: 1,
                userId: 1,
                stateId: 1,
                getHashedToken: jest.fn()
            } as any as UserState;
        })

        it(
            'should return void if the stored ' +
            'hash matches the passed token',
            async () => {
                jest.spyOn(
                    userState,
                    'getHashedToken'
                ).mockReturnValue('test-hash');

                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(true);

                await userStatesService.verifyTokenMatches(
                    userState,
                    'test-token',
                    authContext
                );

                expect(cryptService.verify)
                    .toHaveBeenCalledWith(
                        'test-hash',
                        'test-token'
                    );
            }
        );

        it(
            'should throw a SessionNotFoundException if ' +
            'the returned hash doesn\'t match the token',
            async () => {
                jest.spyOn(
                    userState,
                    'getHashedToken'
                ).mockReturnValue('test-hash');

                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(false);

                await expect(
                    userStatesService.verifyTokenMatches(
                        userState,
                        'test-token',
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
            'should throw a SessionNotFoundException if ' +
            'the UserState object doesn\'t have a hash stored',
            async () => {
                jest.spyOn(
                    userState,
                    'getHashedToken'
                ).mockReturnValue(null);

                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(false);

                await expect(
                    userStatesService.verifyTokenMatches(
                        userState,
                        'test-token',
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
    });

    describe('resolveStates', () => {
        it(
            'should find all of the UserStates matching the ' +
            'provided userId and StateName list, and resolve ' +
            'each of them',
            async () => {
                const userState1 = {
                    id: 1,
                    userId: 1,
                    stateId: 1,
                    resolve: jest.fn()
                } as any as UserState;

                const userState2 = {
                    id: 2,
                    userId: 1,
                    stateId: 2,
                    resolve: jest.fn()
                } as any as UserState;

                const service = userStatesService as unknown as {
                    findAllByUserIdAndNames: jest.Mock,
                    bulkSave: jest.Mock
                };

                jest.spyOn(
                    service,
                    'findAllByUserIdAndNames'
                ).mockResolvedValue([
                    userState1,
                    userState2
                ]);

                jest.spyOn(
                    service,
                    'bulkSave'
                ).mockResolvedValue({});

                await userStatesService.resolveStates(
                    1,
                    [
                        UserStateName.ACCOUNT_LOCKED,
                        UserStateName.SESSION_LIMIT_EXCEEDED
                    ]
                );

                expect(userState1.resolve)
                    .toHaveBeenCalled();

                expect(userState2.resolve)
                    .toHaveBeenCalled();

                expect(service.bulkSave)
                    .toHaveBeenCalledWith([
                        userState1,
                        userState2
                    ]);
            }
        );
    });
});
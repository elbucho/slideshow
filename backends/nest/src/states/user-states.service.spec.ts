import { Repository } from 'typeorm';
import { UserState } from
        '@/database/entities/user-state.entity';
import { State } from
        '@/database/entities/state.entity';
import { StatesService } from './states.service';
import { CryptService } from '@/crypt/crypt.service';
import { UserStateName } from './user-states.types';
import { UserStatesService } from './user-states.service';

describe('UserStatesService', () => {
    let repository: Repository<UserState>;
    let statesService: StatesService;
    let cryptService: CryptService;
    let userStatesService: UserStatesService;

    beforeEach(() => {
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
            statesService,
            cryptService
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
                            UserStateName.SESSION_LIMIT_REACHED
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
                        UserStateName.SESSION_LIMIT_REACHED
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
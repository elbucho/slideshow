import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UsersService } from './users.service';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { UserState } from
        '@/database/entities/user-state.entity';
import { UserStateName } from '@/states/user-states.types';

describe('UsersService', () => {
    let repository: jest.Mocked<Repository<User>>;
    let userStatesService: UserStatesService;
    let usersService: UsersService;
    let cryptService: CryptService;

    beforeEach(() => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            metadata: {
                name: 'User'
            }
        } as any as jest.Mocked<Repository<User>>;

        userStatesService = {
            findOrCreate: jest.fn()
        } as any as jest.Mocked<UserStatesService>;

        cryptService = {
            verify: jest.fn(),
            hash: jest.fn()
        } as any as jest.Mocked<CryptService>;

        usersService = new UsersService(
            repository,
            userStatesService,
            cryptService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByUsernameOrEmail', () => {
        it(
            'should return a user if the passed identifier ' +
            'exists in the db',
            async () => {
                const user = {
                    email: 'test@example.com'
                } as any as User;

                const service = usersService as unknown as {
                    findOneOrFail: jest.Mock
                };

                jest.spyOn(
                    service,
                    'findOneOrFail'
                ).mockResolvedValue(user);

                await expect(
                    usersService.findByUsernameOrEmail(
                        'test@example.com'
                    )
                ).resolves.toBe(user);
            }
        );

        it(
            'should also hydrate the states relations ' +
            'if includeStates is set to true',
            async () => {
                const user = {
                    email: 'test@example.com',
                    states: [
                        new UserState()
                    ]
                } as any as User;

                const service = usersService as unknown as {
                    findOneOrFail: jest.Mock
                };

                jest.spyOn(
                    service,
                    'findOneOrFail'
                ).mockResolvedValue(user);

                await expect(
                    usersService.findByUsernameOrEmail(
                        'test@example.com',
                        true
                    )
                ).resolves.toBe(user);
            }
        );
    });

    describe('createUser', () => {
        it(
            'should create a user using the provided ' +
            'CreateUserDto',
            async () => {
                const dto = {
                    email: 'test@example.com',
                    username: 'test-user',
                    password: 'test1234'
                } as CreateUserDto;

                const user = {
                    id: 1,
                    email: 'test@example.com',
                    username: 'test-user'
                } as any as User;

                jest.spyOn(
                    cryptService,
                    'hash'
                ).mockResolvedValue('test-hash');

                const setHashedPasswordSpy =
                    jest.spyOn(
                        User.prototype,
                        'setHashedPassword'
                    );

                jest.spyOn(
                    usersService,
                    'save'
                ).mockResolvedValue(user);

                await expect(
                    usersService.createUser(dto)
                ).resolves.toBe(user);

                expect(setHashedPasswordSpy)
                    .toHaveBeenCalledWith('test-hash');
            }
        );
    });

    describe('setState', () => {
        it(
            'should find or create a UserState matching ' +
            'the user ID and UserStateName, set the ' +
            'expiresAt and data values to the arguments ' +
            'provided, and save the state to the user',
            async () => {
                const expiresAt = new Date(Date.now() + 10000);
                const data = { foo: 'bar' };

                const user = {
                    id: 1,
                    setState: jest.fn()
                } as any as User;

                const userState = {
                    id: 1,
                    stateId: 1,
                    expiresAt,
                    data
                } as any as UserState;

                const savedUser = {
                    ...user,
                    states: [
                        userState
                    ]
                } as any as User;

                jest.spyOn(
                    userStatesService,
                    'findOrCreate'
                ).mockResolvedValue(userState);

                const service = usersService as unknown as {
                    saveWithRelations: jest.Mock
                };

                jest.spyOn(
                    service,
                    'saveWithRelations'
                ).mockResolvedValue(savedUser);

                await expect(
                    usersService.setState(
                        user,
                        UserStateName.ACCOUNT_LOCKED,
                        data,
                        expiresAt
                    )
                ).resolves.toBe(savedUser);

                expect(user.setState)
                    .toHaveBeenCalledWith(userState);

                expect(service.saveWithRelations)
                    .toHaveBeenCalledWith(
                        user,
                        [ 'states.state' ]
                    );
            }
        );
    });

    describe('resolveStates', () => {
        it(
            'should call the resolveState function ' +
            'on the passed user object, and call ' +
            'usersService.saveWithRelations to ' +
            'record it in the db',
            async () => {
                const state =
                    UserStateName.ACCOUNT_LOCKED;

                const user = {
                    resolveState: jest.fn()
                } as any as User;

                const savedUser = {
                    ...user,
                    states: [
                        {} as UserState
                    ]
                } as any as User;

                const service = usersService as unknown as {
                    saveWithRelations: jest.Mock
                };

                jest.spyOn(
                    service,
                    'saveWithRelations'
                ).mockResolvedValue(savedUser);

                await expect(
                    usersService.resolveState(
                        user,
                        state
                    )
                ).resolves.toBe(savedUser);

                expect(user.resolveState)
                    .toHaveBeenCalledWith(state);

                expect(service.saveWithRelations)
                    .toHaveBeenCalledWith(
                        user,
                        [ 'states.state' ]
                    );
            }
        );
    });
});
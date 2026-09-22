import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UsersService } from './users.service';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { UserState } from
        '@/database/entities/user-state.entity';
import { Session } from '@/database/entities/session.entity';
import { UserStateName } from '@/states/user-states.types';
import { InvalidCredentialsException } from '@/common/exceptions';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';

describe('UsersService', () => {
    let repository: jest.Mocked<Repository<User>>;
    let userStatesService: UserStatesService;
    let usersService: UsersService;
    let cryptService: CryptService;
    let sessionsService: SessionsService;

    const user = {
        id: 1,
        username: 'test-user',
        email: 'test@example.com',
        setHashedPassword: jest.fn()
    } as any as User;

    const session = {
        id: 1,
        userId: 1
    } as any as Session;

    const authUser = {
        userId: 1,
        sessionId: 1
    } as AuthUser;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

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

        sessionsService = {
            findByAuthUser: jest.fn(),
            revoke: jest.fn()
        } as any as jest.Mocked<SessionsService>;

        usersService = new UsersService(
            repository,
            userStatesService,
            cryptService,
            sessionsService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByIdOrFail', () => {
        it(
            'should call this.findById to locate ' +
            'the user record',
            async () => {
                jest.spyOn(
                    usersService,
                    'findById'
                ).mockResolvedValue(user);

                await expect(
                    usersService.findByIdOrFail(
                        1
                    )
                ).resolves.toBe(user);
            }
        );

        it(
            'should throw an InvalidCredentialsException ' +
            'if the user was not located',
            async () => {
                jest.spyOn(
                    usersService,
                    'findById'
                ).mockResolvedValue(null);

                await expect(
                    usersService.findByIdOrFail(
                        1
                    )
                ).rejects.toThrow(
                    new InvalidCredentialsException(
                        'Invalid token'
                    )
                );
            }
        );
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

    describe('updateUser', () => {
        beforeEach(() => {
            jest.spyOn(
                usersService,
                'findByIdOrFail'
            ).mockResolvedValue(user);

            jest.spyOn(
                sessionsService,
                'findByAuthUser'
            ).mockResolvedValue(session);

            jest.spyOn(
                usersService,
                'save'
            ).mockImplementation(
                async (user: User) => user
            );
        });

        afterEach(() => {
            expect(sessionsService.revoke)
                .toHaveBeenCalledWith(
                    session,
                    authContext,
                    'AUTO',
                    'User credentials updated'
                );

            jest.resetAllMocks();
        });

        it(
            'should encrypt the password and store ' +
            'it in the passwordHash field if the ' +
            'UpdateUserDto contains a password',
            async () => {
                jest.spyOn(
                    cryptService,
                    'hash'
                ).mockResolvedValue('test-hash');

                await expect(
                    usersService.updateUser(
                        authUser,
                        authContext,
                        {
                            password: 'new-password'
                        }
                    )
                ).resolves.toBe(user);

                expect(cryptService.hash)
                    .toHaveBeenCalledWith('new-password');

                expect(user.setHashedPassword)
                    .toHaveBeenCalledWith('test-hash');
            }
        );

        it(
            'should move the current email to user.oldEmail ' +
            'and set the user.email value to the email provided ' +
            'if the "email" field is set in the UpdateUserDto',
            async () => {
                await expect(
                    usersService.updateUser(
                        authUser,
                        authContext,
                        {
                            email: 'new-email@example.com'
                        }
                    )
                ).resolves.toEqual({
                    ...user,
                    oldEmail: 'test@example.com',
                    email: 'new-email@example.com'
                });
            }
        );

        it(
            'should update the username if a ' +
            'username is provided in the UpdateUserDto',
            async () => {
                await expect(
                    usersService.updateUser(
                        authUser,
                        authContext,
                        {
                            username: 'new-username'
                        }
                    )
                ).resolves.toEqual({
                    ...user,
                    username: 'new-username'
                });
            }
        );
    });

    describe('deleteUser', () => {
        it(
            'should call the usersService.delete method ' +
            'for the user entity and revoke the user\'s session',
            async () => {
                jest.spyOn(
                    usersService,
                    'findByIdOrFail'
                ).mockResolvedValue(user);

                jest.spyOn(
                    usersService,
                    'delete'
                ).mockResolvedValue(true);

                jest.spyOn(
                    sessionsService,
                    'findByAuthUser'
                ).mockResolvedValue(session);

                await usersService.deleteUser(
                    authUser,
                    authContext
                );

                expect(usersService.delete)
                    .toHaveBeenCalledWith(user);

                expect(sessionsService.revoke)
                    .toHaveBeenCalledWith(
                        session,
                        authContext,
                        1,
                        'User deleted their account'
                    );
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

        it(
            'should set data and expiresAt to null if ' +
            'they were not provided as parameters',
            async () => {
                const user = {
                    id: 1,
                    setState: jest.fn()
                } as any as User;

                const userState = {
                    id: 1,
                    stateId: 1
                } as any as UserState;

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
                ).mockImplementation(
                    (user: User, _) => user
                );

                await usersService.setState(
                    user,
                    UserStateName.ACCOUNT_LOCKED
                );

                expect(user.setState)
                    .toHaveBeenCalledWith(
                        expect.objectContaining({
                            id: 1,
                            stateId: 1,
                            expiresAt: null,
                            data: null
                        })
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
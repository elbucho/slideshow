import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UsersService } from './users.service';
import { AuditService } from '@/audit/audit.service';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserState } from
        '@/database/entities/user-state.entity';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { InvalidCredentialsException } from '@/common/exceptions';
import { UserStateName } from '@/states/user-states.types';
import {
    AuthEvents,
    LockedUserLoginAttemptEvent,
    UserAccountLockedEvent,
    UserLoginFailedEvent
} from '@/events/auth.events';

describe('UsersService', () => {
    let repository: jest.Mocked<Repository<User>>;
    let auditService: AuditService;
    let userStatesService: UserStatesService;
    let usersService: UsersService;
    let cryptService: CryptService;
    let configService: ConfigService;
    let eventEmitter: EventEmitter2;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test agent'
    } as AuthContext;

    beforeEach(() => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            metadata: {
                name: 'User'
            }
        } as any as jest.Mocked<Repository<User>>;

        auditService = {
            getRecentFailedLoginCount: jest.fn(),
        } as any as jest.Mocked<AuditService>;

        userStatesService = {
            findOrCreate: jest.fn()
        } as any as jest.Mocked<UserStatesService>;

        cryptService = {
            verify: jest.fn(),
            hash: jest.fn()
        } as any as jest.Mocked<CryptService>;

        configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        eventEmitter = {
            emitAsync: jest.fn().mockResolvedValue(true)
        } as any as jest.Mocked<EventEmitter2>;

        usersService = new UsersService(
            repository,
            configService,
            eventEmitter,
            auditService,
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

    describe('verifyNotLocked', () => {
        let user: User;

        beforeEach(() => {
            user = {
                id: 1,
                hasState: jest.fn()
            } as any as User;
        })

        it(
            'should call the user.hasState method to ' +
            'determine whether the ACCOUNT_LOCKED state ' +
            'has been applied',
            async () => {
                jest.spyOn(
                    user,
                    'hasState'
                ).mockReturnValue(false);

                await usersService.verifyNotLocked(
                    user,
                    authContext
                );

                expect(eventEmitter.emitAsync)
                    .not.toHaveBeenCalled();
            }
        );

        it(
            'should emit a LOCKED_USER_LOGIN_ATTEMPT event ' +
            'and throw an InvalidCredentialsException if ' +
            'the user has the ACCOUNT_LOCKED state',
            async () => {
                jest.spyOn(
                    user,
                    'hasState'
                ).mockReturnValue(true);

                await expect(
                    usersService.verifyNotLocked(
                        user,
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

    describe('verifyPasswordMatches', () => {
        let user: User;

        beforeEach(() => {
            user = {
                id: 1,
                email: 'test@example.com',
                getHashedPassword: jest.fn()
                    .mockReturnValue('test-hash')
            } as any as User;
        });

        it(
            'should check cryptService to verify whether the ' +
            'provided password matches the passwordHash stored ' +
            'in the user object',
            async () => {
                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(true);

                await usersService.verifyPasswordMatches(
                    user,
                    'test-pass',
                    authContext
                );
            }
        );

        it(
            'should emit an INVALID_PASSWORD event and call ' +
            'checkIfShouldLock on the user object before throwing ' +
            'an InvalidCredentialsException if the password ' +
            'doesn\'t match',
            async () => {
                jest.spyOn(
                    cryptService,
                    'verify'
                ).mockResolvedValue(false);

                jest.spyOn(
                    usersService,
                    'checkIfShouldLock'
                ).mockResolvedValue(undefined);

                await expect(
                    usersService.verifyPasswordMatches(
                        user,
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

                expect(usersService.checkIfShouldLock)
                    .toHaveBeenCalledWith(
                        user,
                        authContext
                    );
            }
        );
    });

    describe('checkIfShouldLock', () => {
        const user = {} as any as User;

        beforeEach(() => {
            jest.spyOn(
                configService,
                'get'
            )
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(10000);
        });

        it(
            'should do nothing if the user has failed ' +
            'logins below the cutoff threshold',
            async () => {
                jest.spyOn(
                    auditService,
                    'getRecentFailedLoginCount'
                ).mockResolvedValue(3);

                await usersService.checkIfShouldLock(
                    user,
                    authContext
                );

                expect(
                    auditService.getRecentFailedLoginCount
                ).toHaveBeenCalledWith(
                    user,
                    expect.any(Date)
                );
            }
        );

        it(
            'should call the lockUser function if ' +
            'the number of failed logins exceeds the ' +
            'maxFailedLogins threshold',
            async () => {
                jest.spyOn(
                    auditService,
                    'getRecentFailedLoginCount'
                ).mockResolvedValue(5);

                jest.spyOn(
                    usersService,
                    'lockUser'
                ).mockResolvedValue(undefined);

                await usersService.checkIfShouldLock(
                    user,
                    authContext
                );

                expect(usersService.lockUser)
                    .toHaveBeenCalledWith(
                        user,
                        expect.any(Date),
                        authContext
                    );
            }
        );
    });

    describe('lockUser', () => {
        it(
            'should emit a USER_ACCOUNT_LOCKED ' +
            'event then call the setState function to ' +
            'set the ACCOUNT_LOCKED state on the user',
            async () => {
                const user = { id: 1 } as any as User;
                const timeout = new Date(Date.now() + 10000);

                jest.spyOn(
                    usersService,
                    'setState'
                ).mockResolvedValue(user);

                await usersService.lockUser(
                    user,
                    timeout,
                    authContext
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.USER_ACCOUNT_LOCKED,
                        new UserAccountLockedEvent(
                            1,
                            authContext.ipAddress,
                            authContext.userAgent,
                            'AUTO',
                            'Max unsuccessful login count within ' +
                            'lockout period exceeded'
                        )
                    );

                expect(usersService.setState)
                    .toHaveBeenCalledWith(
                        user,
                        UserStateName.ACCOUNT_LOCKED,
                        null,
                        timeout
                    );
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
                        [ 'states' ]
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
                        [ 'states' ]
                    );
            }
        );
    });
});
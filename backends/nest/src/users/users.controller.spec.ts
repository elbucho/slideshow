import { UsersController } from './users.controller';
import { UsersService } from '@/users/users.service';
import { User } from '@/database/entities/user.entity';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { QueryOptions } from '@/database/decorators/query-options.decorator';

describe('UsersController', () => {
    let usersController: UsersController;

    const usersService = {
        findByIdOrFail: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn()
    } as any as UsersService;

    const user = {
        id: 1,
        username: 'test-user',
        email: 'test@example.com'
    } as User;

    const authUser = {
        userId: 1,
        sessionId: 1
    } as AuthUser;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    const opts = {} as Partial<QueryOptions>;

    beforeEach(() => {
        usersController = new UsersController(
            usersService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUser', () => {
        it(
            'fetches the user via the UsersService.' +
            'findByIdOrFail method',
            async () => {
                jest.spyOn(
                    usersService,
                    'findByIdOrFail'
                ).mockResolvedValue(user);

                await expect(
                    usersController.getUser(
                        authUser,
                        opts
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'RESOURCE_FETCHED',
                    details: user
                });
            }
        );
    });

    describe('createUser', () => {
        it(
            'calls UsersService.createUser to create ' +
            'the user with the provided CreateUserDto, and ' +
            'returns the new user entity',
            async () => {
                jest.spyOn(
                    usersService,
                    'createUser'
                ).mockResolvedValue(user);

                await expect(
                    usersController.createUser({
                        username: 'test-user',
                        email: 'test@example.com',
                        password: 'test-password'
                    })
                ).resolves.toEqual({
                    type: 'success',
                    code: 'RESOURCE_CREATED',
                    details: user
                });
            }
        );
    });

    describe('updateUser', () => {
        it(
            'calls UsersService.updateUser to update ' +
            'the user entity with the provided UpdateUserDto ' +
            'and then returns the updated object',
            async () => {
                const updatedUser = {
                    ...user,
                    username: 'new-username'
                } as User;

                jest.spyOn(
                    usersService,
                    'updateUser'
                ).mockResolvedValue(updatedUser);

                await expect(
                    usersController.updateUser(
                        authUser,
                        authContext,
                        {
                            username: 'new-username'
                        }
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'RESOURCE_UPDATED',
                    details: updatedUser
                });
            }
        );
    });

    describe('deleteUser', () => {
        it(
            'calls UsersService.deleteUser to delete ' +
            'the current user\'s account',
            async () => {
                await expect(
                    usersController.deleteUser(
                        authUser,
                        authContext
                    )
                ).resolves.toEqual({
                    type: 'success',
                    code: 'RESOURCE_DELETED',
                    details: {}
                });

                expect(usersService.deleteUser)
                    .toHaveBeenCalledWith(
                        authUser,
                        authContext
                    );
            }
        );
    });
});
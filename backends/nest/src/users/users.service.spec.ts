import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '@/common/exceptions';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let users: jest.Mocked<Repository<User>>;
    let usersService: UsersService;

    beforeAll(() => {
        users = {
            findOneBy: jest.fn(),
            save: jest.fn()
        } as any as jest.Mocked<Repository<User>>;

        usersService = new UsersService(users);
    });

    describe('findById', () => {
        it('should return a user if the passed id exists in the db', () => {
            const user = {
                id: 1
            } as any as User;

            users.findOneBy.mockResolvedValue(user);

            expect(
                usersService.findById(1)
            ).resolves.toStrictEqual(
                user
            );
        });

        it('should throw a ResourceNotFoundException if the user doesn\'t exist in the db', () => {
            users.findOneBy.mockResolvedValue(null);

            expect(
                usersService.findById(1)
            ).rejects.toThrow(
                new ResourceNotFoundException(
                    'Unable to locate the requested user',
                    {
                        id: 1
                    }
                )
            );
        });
    });

    describe('findByUsernameOrEmail', () => {
        it('should return a user if the passed email exists in the db', () => {
            const user = {
                email: 'test@example.com'
            } as any as User;

            users.findOneBy.mockResolvedValue(user);

            expect(
                usersService.findByUsernameOrEmail('test@example.com')
            ).resolves.toStrictEqual(
                user
            );
        });

        it('should return a user if the passed username exists in the db', () => {
            const user = {
                username: 'test-user'
            } as any as User;

            users.findOneBy.mockResolvedValue(user);

            expect(
                usersService.findByUsernameOrEmail('test-user')
            ).resolves.toStrictEqual(
                user
            );
        });

        it('should throw a ResourceNotFoundException if the user doesn\'t exist in the db', () => {
            users.findOneBy.mockResolvedValue(null);

            expect(
                usersService.findByUsernameOrEmail('test@example.com')
            ).rejects.toThrow(
                new ResourceNotFoundException(
                    'Unable to locate the requested user',
                    {
                        search_key: 'test@example.com'
                    }
                )
            );
        });
    });

    describe('createUser', () => {
        it('should create a user using the provided CreateUserDto', async () => {
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

            users.save.mockResolvedValue(user);

            await expect(
                usersService.createUser(dto)
            ).resolves.toStrictEqual(
                user
            );
        });
    });
});
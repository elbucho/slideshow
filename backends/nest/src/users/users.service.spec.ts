import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '@/common/exceptions';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UsersService } from './users.service';
import { AuditService } from '@/audit/audit.service';
import { StatesService } from '@/states/states.service';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('UsersService', () => {
    let users: jest.Mocked<Repository<User>>;
    let auditService: AuditService;
    let statesService: StatesService;
    let userStatesService: UserStatesService;
    let usersService: UsersService;
    let cryptService: CryptService;
    let configService: ConfigService;
    let eventEmitter: EventEmitter2;

    beforeAll(() => {
        users = {
            findOne: jest.fn(),
            save: jest.fn()
        } as any as jest.Mocked<Repository<User>>;

        auditService = {
            getRecentFailedLoginCount: jest.fn(),
        } as any as jest.Mocked<AuditService>;

        statesService = {
            findOrCreate: jest.fn(),
        } as any as jest.Mocked<StatesService>;

        userStatesService = {
            findByUserAndState: jest.fn(),
            createUserState: jest.fn(),
            save: jest.fn()
        } as any as jest.Mocked<UserStatesService>;

        cryptService = {
            verify: jest.fn(),
            hash: jest.fn()
        } as any as jest.Mocked<CryptService>;

        configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as jest.Mocked<EventEmitter2>;

        usersService = new UsersService(
            users,
            auditService,
            userStatesService,
            cryptService,
            configService,
            eventEmitter
        );
    });

    describe('findById', () => {
        it('should return a user if the passed id exists in the db', () => {
            const user = {
                id: 1
            } as any as User;

            users.findOne.mockResolvedValue(user);

            expect(
                usersService.findById(1)
            ).resolves.toStrictEqual(
                user
            );
        });

        it('should throw a ResourceNotFoundException if the user doesn\'t exist in the db', () => {
            users.findOne.mockResolvedValue(null);

            expect(
                usersService.findById(1)
            ).rejects.toThrow(
                new ResourceNotFoundException(
                    'user',
                    'id',
                    1
                )
            );
        });
    });

    describe('findByUsernameOrEmail', () => {
        it('should return a user if the passed email exists in the db', () => {
            const user = {
                email: 'test@example.com'
            } as any as User;

            users.findOne.mockResolvedValue(user);

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

            users.findOne.mockResolvedValue(user);

            expect(
                usersService.findByUsernameOrEmail('test-user')
            ).resolves.toStrictEqual(
                user
            );
        });

        it('should throw a ResourceNotFoundException if the user doesn\'t exist in the db', () => {
            users.findOne.mockResolvedValue(null);

            expect(
                usersService.findByUsernameOrEmail('test@example.com')
            ).rejects.toThrow(
                new ResourceNotFoundException(
                    'user',
                    'username',
                    'test@example.com'
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
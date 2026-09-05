import { Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { CreateUserDto } from '@/users/dtos/create-user.dto';
import { UsersService } from './users.service';
import { AuditService } from '@/audit/audit.service';
import { UserStatesService } from '@/states/user-states.service';
import { CryptService } from '@/crypt/crypt.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {UserState} from "@/database/entities/user-state.entity";

describe('UsersService', () => {
    let repository: jest.Mocked<Repository<User>>;
    let auditService: AuditService;
    let userStatesService: UserStatesService;
    let usersService: UsersService;
    let cryptService: CryptService;
    let configService: ConfigService;
    let eventEmitter: EventEmitter2;

    beforeAll(() => {
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
            repository,
            configService,
            eventEmitter,
            auditService,
            userStatesService,
            cryptService,
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
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import { UsersService } from '@/users/users.service';
import { seedTestUser, TEST_USER } from '@test/seeds/user.seed';
import { login } from '@test/helpers/auth';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { UserStateName } from '@/states/user-states.types';
import {SessionsService} from "@/auth/sessions/sessions.service";

describe('Auth', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let auditLogs: Repository<AuditLog>;
    let usersService: UsersService;
    let configService: ConfigService;
    let sessionsService: SessionsService;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ],
            }).compile();

        dataSource = moduleFixture.get(DataSource);
        auditLogs = dataSource.getRepository(AuditLog);

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new ErrorResponseFilter());

        usersService = app.get<UsersService>(UsersService);
        sessionsService = app.get<SessionsService>(SessionsService);
        configService = app.get<ConfigService>(ConfigService);

        await app.init();
        await dataSource.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE'
        );

        await seedTestUser(usersService);
    });

    beforeEach(async () => {
        await auditLogs.clear();
        await dataSource.query(
            'TRUNCATE TABLE "sessions" RESTART IDENTITY CASCADE'
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /auth/login', () => {
        let response: request.Response;

        afterEach(() => {
            expect(response).toSatisfyApiSpec(
                '/auth/login',
                'POST'
            );
        });

        it(
            'should authenticate the user when ' +
            'proper credentials are supplied',
            async () => {
                for (
                    const identifier of [
                        'test-user',
                        'test@example.com'
                    ]
                ) {
                    response = await login(
                        app,
                        identifier
                    );

                    expect(response.body.code)
                        .toEqual('AUTHENTICATED');
                }
            }
        );

        it(
            'should return a VALIDATION_ERROR response if ' +
            'the request doesn\'t contain the correct schema',
            async () => {
                for (const field of [ 'username', 'password' ]) {
                    let body = {
                        username: TEST_USER.username,
                        password: TEST_USER.password
                    } as Record<string, string>;

                    delete body[field];

                    response = await request(app.getHttpServer())
                        .post('/auth/login')
                        .send(body)
                        .expect(400);

                    expect(response.body.code)
                        .toEqual('VALIDATION_ERROR');
                }
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'when the username + password is incorrect',
            async () => {
                response = await request(app.getHttpServer())
                    .post('/auth/login')
                    .send({
                        username: TEST_USER.username,
                        password: 'invalid password'
                    })
                    .expect(401);

                expect(response.body.code)
                    .toEqual('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toEqual('Invalid username or password');
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'when the account is locked',
            async () => {
                const user =
                    await usersService.findByUsernameOrEmail(
                        TEST_USER.username,
                        true
                    );

                await usersService.lockUser(
                    user,
                    new Date(Date.now() + 5000),
                    authContext
                );

                response = await login(
                    app,
                    TEST_USER.username,
                    TEST_USER.password,
                    401
                );

                expect(response.body.code)
                    .toEqual('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toEqual('Account is currently locked out');

                await usersService.resolveState(
                    user,
                    UserStateName.ACCOUNT_LOCKED
                );
            }
        );

        it(
            'should return a SESSION_LIMIT_REACHED code if ' +
            'the user has too many concurrent active sessions',
            async () => {
                const maxSessions = configService.get(
                    'users.maxActiveSessions'
                ) as number;

                const user =
                    await usersService.findByUsernameOrEmail(
                        TEST_USER.username,
                        true
                    );

                for (let i=0;i<maxSessions;i++) {
                    await sessionsService.create(
                        user.id,
                        {
                            ipAddress: `127.0.0.${i}`,
                            userAgent: `test-agent-${i}`
                        }
                    );
                }

                response = await login(app);

                expect(response.body.code)
                    .toEqual('SESSION_LIMIT_REACHED');

                expect(response.body.details?.sessions?.length)
                    .toEqual(maxSessions);
            }
        );
    });
});
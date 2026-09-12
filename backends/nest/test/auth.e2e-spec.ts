import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import { UsersService } from '@/users/users.service';
import { seedTestUser, TEST_USER } from '@test/seeds/user.seed';
import { login, getTokenAndPayload } from '@test/helpers/auth';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { UserStateName } from '@/states/user-states.types';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';

describe('Auth', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let auditLogs: Repository<AuditLog>;
    let usersService: UsersService;
    let configService: ConfigService;
    let sessionsService: SessionsService;
    let jwtService: JwtService;

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
        jwtService = app.get<JwtService>(JwtService);

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
            'when the username or email is not found',
            async () => {
                for (
                    const identifier of [
                    'invalid-user',
                    'invalid@email.com'
                ]
                    ) {
                    response = await login(
                        app,
                        identifier,
                        TEST_USER.password,
                        401
                    );

                    expect(response.body.code)
                        .toEqual('INVALID_CREDENTIALS');

                    expect(response.body.details?.message)
                        .toEqual('Invalid username or password');
                }
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'when the password is incorrect',
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

    describe('POST /auth/logout', () => {
        let response: request.Response;

        afterEach(() => {
            expect(response).toSatisfyApiSpec(
                '/auth/logout',
                'POST'
            )
        });

        it(
            'should terminate the user\'s session and ' +
            'return a LOGGED_OUT code',
            async () => {
                const { token, payload } =
                    await getTokenAndPayload(
                        app,
                        'access_token'
                    );

                expect(payload.sid).toBeDefined();

                response =
                    await request(app.getHttpServer())
                        .post('/auth/logout')
                        .set(
                            'Authorization',
                            `Bearer ${token}`
                        )
                        .expect(200);

                const session =
                    await sessionsService.findById(
                        payload.sid,
                        {
                            includeDeleted: true
                        }
                    );

                expect(session).toBeDefined();
                expect(session?.deletedAt)
                    .toEqual(expect.any(Date));

                expect(response.body?.code)
                    .toBe('LOGGED_OUT');
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'if the accessToken is invalid',
            async () => {
                response =
                    await request(app.getHttpServer())
                        .post('/auth/logout')
                        .set(
                            'Authorization',
                            'Bearer invalid-token'
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toBe('Invalid token');
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'if the sid payload is not present in the accessToken',
            async () => {
                const secret = configService.get(
                    'jwt.access.secret'
                );

                const badToken = jwtService.sign(
                    {
                        sub: 1,
                        type: 'access'
                    },
                    {
                        secret,
                        expiresIn: '10000ms',
                        jwtid: randomUUID()
                    }
                );

                response =
                    await request(app.getHttpServer())
                        .post('/auth/logout')
                        .set(
                            'Authorization',
                            `Bearer ${badToken}`
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toBe('Invalid token');
            }
        );

        it(
            'should return an SESSION_NOT_FOUND code if ' +
            'the sid referred to in the payload doesn\'t exist ' +
            'or is deleted',
            async () => {
                const { token, payload } =
                    await getTokenAndPayload(
                        app,
                        'access_token'
                    );

                expect(payload.sid).toBeDefined();

                const session =
                    await sessionsService.findById(
                        payload.sid
                    ) as Session;

                expect(session).toBeDefined();

                await sessionsService.delete(session);

                response =
                    await request(app.getHttpServer())
                        .post('/auth/logout')
                        .set(
                            'Authorization',
                            `Bearer ${token}`
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('SESSION_NOT_FOUND');

                expect(response.body.details?.message)
                    .toBe('Invalid token');

            }
        );
    });

    describe('POST /auth/refresh', () => {
        let response: request.Response;

        afterEach(() => {
            expect(response).toSatisfyApiSpec(
                    '/auth/refresh',
                    'POST'
                )
        });

        it(
            'should refresh a user\'s tokens and return ' +
            'a TOKENS_REFRESHED code',
            async () => {
                const { token } =
                    await getTokenAndPayload(
                        app,
                        'refresh_token'
                    );

                response = await request(app.getHttpServer())
                    .post('/auth/refresh')
                    .set(
                        'Authorization',
                        `Bearer ${token}`
                    )
                    .expect(200);

                expect(response.body.code)
                    .toBe('TOKENS_REFRESHED');
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'if the refreshToken is invalid',
            async () => {
                response =
                    await request(app.getHttpServer())
                        .post('/auth/refresh')
                        .set(
                            'Authorization',
                            'Bearer invalid-token'
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toBe('Invalid token');
            }
        );

        it(
            'should return an INVALID_CREDENTIALS code ' +
            'if the sid payload is not present in the refreshToken',
            async () => {
                const secret = configService.get(
                    'jwt.refresh.secret'
                );

                const badToken = jwtService.sign(
                    {
                        sub: 1,
                        type: 'refresh'
                    },
                    {
                        secret,
                        expiresIn: '10000ms',
                        jwtid: randomUUID()
                    }
                );

                response =
                    await request(app.getHttpServer())
                        .post('/auth/refresh')
                        .set(
                            'Authorization',
                            `Bearer ${badToken}`
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toBe('Invalid token');
            }
        );

        it(
            'should return an SESSION_NOT_FOUND code if ' +
            'the sid referred to in the payload doesn\'t exist ' +
            'or is deleted',
            async () => {
                const { token, payload } =
                    await getTokenAndPayload(
                        app,
                        'refresh_token'
                    );

                expect(payload.sid).toBeDefined();

                const session =
                    await sessionsService.findById(
                        payload.sid
                    ) as Session;

                expect(session).toBeDefined();

                await sessionsService.delete(session);

                response =
                    await request(app.getHttpServer())
                        .post('/auth/refresh')
                        .set(
                            'Authorization',
                            `Bearer ${token}`
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('SESSION_NOT_FOUND');

                expect(response.body.details?.message)
                    .toBe('Invalid token');

            }
        );

        it(
            'should return a SESSION_EXPIRED code if ' +
            'the session\'s tokenExpiresAt date is in the past',
            async () => {
                const { token, payload } =
                    await getTokenAndPayload(
                        app,
                        'refresh_token'
                    );

                expect(payload.sid).toBeDefined();

                const session =
                    await sessionsService.findById(
                        payload.sid
                    ) as Session;

                expect(session).toBeDefined();

                session.tokenExpiresAt = new Date(
                    Date.now() - 1000
                );

                await sessionsService.save(session);

                response =
                    await request(app.getHttpServer())
                        .post('/auth/refresh')
                        .set(
                            'Authorization',
                            `Bearer ${token}`
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('SESSION_EXPIRED');

                expect(response.body.details?.message)
                    .toBe('Session expired');
            }
        );

        it(
            'should return an INVALID_CREDENTIALS ' +
            'code if the user account is locked',
            async () => {
                const { token, payload } =
                    await getTokenAndPayload(
                        app,
                        'refresh_token'
                    );

                expect(payload.sub).toBeDefined();

                const user =
                    await usersService.findById(
                        payload.sub,
                        {
                            expand: [
                                'states.state'
                            ]
                        }
                    );

                expect(user).toBeDefined();

                await usersService.lockUser(
                    user as User,
                    new Date(
                        Date.now() + 10000
                    ),
                    {
                        ipAddress: '127.0.0.1',
                        userAgent: 'test-agent'
                    }
                );

                response =
                    await request(app.getHttpServer())
                        .post('/auth/refresh')
                        .set(
                            'Authorization',
                            `Bearer ${token}`
                        )
                        .expect(401);

                expect(response.body.code)
                    .toBe('INVALID_CREDENTIALS');

                expect(response.body.details?.message)
                    .toBe('Account is currently locked out');
            }
        );
    });
});
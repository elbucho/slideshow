import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import {
    TEST_USERS,
    seedTestUsers,
    seedTestSessions
} from '@test/seeds/auth-sessions.seed';
import { login } from '@test/helpers/auth';
import { testPagination, testSort } from '@test/helpers/parameters';
import { UsersService } from '@/users/users.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { TokensService } from '@/tokens/tokens.service';
import { Session } from '@/database/entities/session.entity';
import { CryptService } from '@/crypt/crypt.service';

describe('Sessions', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let usersService: UsersService;
    let sessionsService: SessionsService;
    let tokensService: TokensService;
    let configService: ConfigService;
    let cryptService: CryptService;

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ],
            }).compile();

        dataSource = moduleFixture.get(DataSource);

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new ErrorResponseFilter());

        usersService = app.get<UsersService>(UsersService);
        sessionsService = app.get<SessionsService>(SessionsService);
        tokensService = app.get<TokensService>(TokensService);
        configService = app.get<ConfigService>(ConfigService);
        cryptService = app.get<CryptService>(CryptService);

        await app.init();
        await dataSource.query(
            'TRUNCATE TABLE "sessions" RESTART IDENTITY CASCADE'
        );
        await dataSource.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE'
        );

        await seedTestUsers(usersService);
        await seedTestSessions(
            sessionsService,
            tokensService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Accessing via the access token', () => {
        let accessToken: string;

        beforeAll(async () => {
            configService.set(
                'users.maxActiveSessions',
                10
            );

            const response =
                await login(
                    app,
                    TEST_USERS[0].username,
                    TEST_USERS[0].password
                );

            expect(response.body?.details?.access_token)
                .toBeDefined();

            accessToken = response.body.details.access_token;
        });

        afterAll(async () => {
            await dataSource.query(
                'DELETE FROM sessions WHERE id > 5'
            );
        });

        describe('GET /auth/sessions', () => {
            it(
                'should fetch sessions associated with the ' +
                'logged-in user, and allow for pagination via ' +
                'the page and page_size query params',
                async () => {
                    await testPagination(
                        app,
                        accessToken,
                        '/auth/sessions',
                        'GET',
                        4
                    );
                }
            );

            it(
                'should sort the returned items based on ' +
                'the "sort" query parameter',
                async () => {
                    await testSort(
                        app,
                        accessToken,
                        '/auth/sessions',
                        'GET',
                        dataSource.getRepository(Session)
                    );
                }
            );
        });
    });

    describe('accessing via the temporary token', () => {
        let tempToken: string;
        let activeSessions: Session[];

        beforeAll(async () => {
            configService.set(
                'users.maxActiveSessions',
                3
            );

            const response =
                await login(
                    app,
                    TEST_USERS[0].username,
                    TEST_USERS[0].password
                );

            expect(response.body?.details?.temporary_token)
                .toBeDefined();

            tempToken = response.body.details.temporary_token;

            expect(response.body?.details?.sessions)
                .toBeDefined();

            activeSessions = response.body?.details?.sessions as Session[];
        });

        describe('GET /auth/sessions', () => {
            let response: request.Response;

            afterAll(() => {
                expect(response)
                    .toSatisfyApiSpec(
                        '/auth/sessions',
                        'GET'
                    );
            })

            it(
                'should allow users with a temporary token ' +
                'to access this endpoint',
                async () => {
                    response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions')
                            .set(
                                'Authorization',
                                `Bearer ${tempToken}`
                            ).expect(200);

                    expect(
                        response.body?.details?.items
                    ).toBeDefined();

                    expect(
                        response.body.details.items.length
                    ).toEqual(activeSessions.length);
                }
            );

            it(
                'should deny access if the temporary token ' +
                'has expired',
                async () => {
                    const oldTimeoutMs = configService.get(
                        'jwt.temp.timeoutMs'
                    );
                    configService.set(
                        'jwt.temp.timeoutMs',
                        1
                    );

                    const loginResponse =
                        await login(
                            app,
                            TEST_USERS[0].username,
                            TEST_USERS[0].password
                        );

                    const newTempToken =
                        loginResponse.body?.details?.temporary_token;

                    expect(newTempToken).toBeDefined();
                    expect(newTempToken).not.toEqual(tempToken);

                    response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions')
                            .set(
                                'Authorization',
                                `Bearer ${newTempToken}`
                            ).expect(401);

                    expect(response.body.code)
                        .toEqual('SESSION_EXPIRED');

                    configService.set(
                        'jwt.temp.timeoutMs',
                        oldTimeoutMs
                    );
                }
            );

            it(
                'should deny access if the UserState record ' +
                'is resolved',
                async () => {
                    response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions')
                            .set(
                                'Authorization',
                                `Bearer ${tempToken}`
                            ).expect(401);

                    expect(response.body.code)
                        .toEqual('SESSION_NOT_FOUND');
                }
            );

            it(
                'should deny access if the UserState record ' +
                'is deleted',
                async () => {
                    const loginResponse =
                        await login(
                            app,
                            TEST_USERS[0].username,
                            TEST_USERS[0].password
                        );

                    const newTempToken =
                        loginResponse.body?.details?.temporary_token;

                    expect(newTempToken).toBeDefined();
                    expect(newTempToken).not.toEqual(tempToken);
                    tempToken = newTempToken;

                    await dataSource.query(
                        `UPDATE user_states SET deleted_at = NOW()
                            WHERE id = 3`.trim()
                    );

                    response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions')
                            .set(
                                'Authorization',
                                `Bearer ${tempToken}`
                            ).expect(401);

                    expect(response.body.code)
                        .toEqual('SESSION_NOT_FOUND');
                }
            );

            it(
                'should deny access if the tokenHash ' +
                'stored in the associated UserState record ' +
                'doesn\'t match the token string',
                async () => {
                    const loginResponse =
                        await login(
                            app,
                            TEST_USERS[0].username,
                            TEST_USERS[0].password
                        );

                    const newTempToken =
                        loginResponse.body?.details?.temporary_token;

                    expect(newTempToken).toBeDefined();
                    expect(newTempToken).not.toEqual(tempToken);

                    const newHash = await cryptService.hash(
                        'invalid-hash'
                    );

                    await dataSource.query(
                        `UPDATE user_states SET data = jsonb_set(
                            data, '{tokenHash}', $1)
                            WHERE id = 4`.trim(),
                        [ JSON.stringify(newHash) ]
                    );

                    response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions')
                            .set(
                                'Authorization',
                                `Bearer ${newTempToken}`
                            ).expect(401);

                    expect(response.body.code)
                        .toEqual('SESSION_NOT_FOUND');
                }
            );
        });
    });
});
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { App } from 'supertest/types';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { configureApp } from '@/app/helpers/configure-app.helper';
import { AppModule } from '@/app/app.module';
import {
    TEST_USERS,
    seedTestUsers,
    seedTestSessions
} from '@test/seeds/auth-sessions.seed';
import {
    login,
    getUser,
    lockUser,
    unlockUser,
    addStateToUser,
    resolveState
} from '@test/helpers/auth';
import {
    testPagination,
    testSort,
    testIncludeDeleted,
    testExpand
} from '@test/helpers/parameters';
import { UsersService } from '@/users/users.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { TokensService } from '@/tokens/tokens.service';
import { Session } from '@/database/entities/session.entity';
import { CryptService } from '@/crypt/crypt.service';
import { UserStateName } from '@/states/user-states.types';

async function tooManySessionsLogin(
    app: INestApplication
): Promise<{ token: string, sessions: Session[] }> {
    const loginResponse =
        await login(
            app,
            TEST_USERS[0].username,
            TEST_USERS[0].password
        );

    const token =
        loginResponse.body?.details?.temporary_token;

    expect(token).toBeDefined();

    const sessions =
        loginResponse.body?.details?.sessions;

    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions))
        .toBe(true);

    return {
        token,
        sessions
    };
}

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
        configureApp(app);

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

            await dataSource.query(
                'UPDATE sessions SET deleted_at = NULL'
            );
        });

        describe('GET /auth/sessions', () => {
            it(
                'should fetch sessions associated with the ' +
                'logged-in user, and allow for pagination via ' +
                'the page and pageSize query params',
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

            it(
                'should allow the user to retrieve deleted items ' +
                'if "includeDeleted" is set to true',
                async () => {
                    await testIncludeDeleted(
                        app,
                        accessToken,
                        '/auth/sessions',
                        'GET',
                        dataSource.getRepository(Session)
                    );
                }
            );
        });

        describe('DELETE /auth/sessions', () => {
            it(
                'should return a VALIDATION_ERROR if the ' +
                'payload is invalid',
                async () => {
                    const payloads = [
                        undefined,
                        {},
                        { foo: 'bar' },
                        { ids: [] },
                        { ids: 'invalid' },
                        { ids: [ 'invalid id' ] }
                    ];

                    for (const payload of payloads) {
                        const response =
                            await request(app.getHttpServer())
                                .delete('/auth/sessions')
                                .send(payload)
                                .set(
                                    'Authorization',
                                    `Bearer ${accessToken}`
                                ).expect(400);

                        expect(response).toSatisfyApiSpec(
                            '/auth/sessions',
                            'DELETE'
                        );
                    }
                }
            );

            it(
                'should attempt to delete the provided ' +
                'ids, and return a list of the ones that ' +
                'were deleted successfully',
                async () => {
                    // This user does not own session id 5
                    const payload = {
                        ids: [ 1, 3, 4, 5 ]
                    };

                    expect(payload).toSatisfyApiSpec(
                        '/auth/sessions',
                        'DELETE'
                    );

                    const response =
                        await request(app.getHttpServer())
                            .delete('/auth/sessions')
                            .send(payload)
                            .set(
                                'Authorization',
                                `Bearer ${accessToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCES_DELETED');

                    expect(response.body.details)
                        .toEqual({
                            'session_ids': [ 1, 3, 4 ]
                        });

                    expect(response).toSatisfyApiSpec(
                        '/auth/sessions',
                        'DELETE'
                    );
                }
            )
        });

        describe('GET /auth/session/{id}', () => {
            it(
                'should return a RESOURCE_NOT_FOUND ' +
                'if the id provided doesn\'t exist, doesn\'t ' +
                'belong to the user, or is deleted',
                async () => {
                    const sessionIds = [
                        12, // Doesn't exist
                        5,  // Doesn't belong to user
                        1,  // Belongs to user, but is deleted
                    ];

                    for (const id of sessionIds) {
                        const response =
                            await request(app.getHttpServer())
                                .get(`/auth/sessions/${id}`)
                                .set(
                                    'Authorization',
                                    `Bearer ${accessToken}`
                                )
                                .expect(404);

                        expect(response.body.code)
                            .toEqual('RESOURCE_NOT_FOUND');

                        expect(response).toSatisfyApiSpec(
                            '/auth/sessions/{id}',
                            'GET'
                        );
                    }
                }
            );

            it(
                'should return the deleted resource if ' +
                'the "includeDeleted" query parameter is set',
                async () => {
                    const response = await request(app.getHttpServer())
                        .get('/auth/sessions/1')
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .query({
                            includeDeleted: true
                        }).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_FETCHED');

                    expect(response).toSatisfyApiSpec(
                        '/auth/sessions/{id}',
                        'GET'
                    );
                }
            );

            it(
                'should allow the "expand" query parameter',
                async () => {
                    const user = await getUser(
                        app,
                        TEST_USERS[0].username
                    );

                    await addStateToUser(
                        app,
                        user,
                        UserStateName.PENDING_ACTIVATION
                    );

                    await testExpand(
                        app,
                        accessToken,
                        '/auth/sessions/2',
                        'GET',
                        Session
                    );

                    await resolveState(
                        app,
                        user,
                        UserStateName.PENDING_ACTIVATION
                    );
                }
            );
        });

        describe('DELETE /auth/sessions/{id}', () => {
            it(
                'should delete a session if it exists and ' +
                'belongs to the user',
                async () => {
                    const response =
                        await request(app.getHttpServer())
                            .delete('/auth/sessions/2')
                            .set(
                                'Authorization',
                                `Bearer ${accessToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_DELETED');

                    expect(response)
                        .toSatisfyApiSpec(
                            '/auth/sessions/{id}',
                            'DELETE'
                        );

                    const session =
                        await sessionsService.findById(
                            2,
                            { includeDeleted: true }
                        );

                    expect(session).toBeDefined();
                    expect(session?.deletedAt)
                        .toEqual(expect.any(Date));
                }
            );

            it(
                'should return RESOURCE_DELETED, but ' +
                'not actually delete a session the user ' +
                'doesn\'t own',
                async () => {
                    const response =
                        await request(app.getHttpServer())
                            .delete('/auth/sessions/5')
                            .set(
                                'Authorization',
                                `Bearer ${accessToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_DELETED');

                    expect(response)
                        .toSatisfyApiSpec(
                            '/auth/sessions/{id}',
                            'DELETE'
                        );

                    const session =
                        await sessionsService.findById(
                            5,
                            { includeDeleted: true }
                        );

                    expect(session).toBeDefined();
                    expect(session?.deletedAt)
                        .toBeNull();
                }
            );

            it(
                'should return RESOURCE_DELETED even when ' +
                'the session id provided doesn\'t exist',
                async () => {
                    const response =
                        await request(app.getHttpServer())
                            .delete('/auth/sessions/15')
                            .set(
                                'Authorization',
                                `Bearer ${accessToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_DELETED');

                    expect(response)
                        .toSatisfyApiSpec(
                            '/auth/sessions/{id}',
                            'DELETE'
                        );

                    const session =
                        await sessionsService.findById(
                            15,
                            { includeDeleted: true }
                        );

                    expect(session).toBeNull();
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

            const { token, sessions } =
                await tooManySessionsLogin(app);

            tempToken = token;
            activeSessions = sessions;
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

                    const { token } =
                        await tooManySessionsLogin(app);

                    response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions')
                            .set(
                                'Authorization',
                                `Bearer ${token}`
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
                    const user = await getUser(
                        app,
                        TEST_USERS[0].username
                    );

                    await resolveState(
                        app,
                        user,
                        UserStateName.SESSION_LIMIT_REACHED
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
                'should deny access if the UserState record ' +
                'is deleted',
                async () => {
                    const { token } =
                        await tooManySessionsLogin(app);

                    tempToken = token;

                    const service = app.get<JwtService>(JwtService);
                    const payload = service.decode(tempToken);
                    expect(payload.sid).toBeDefined();

                    await dataSource.query(
                        `UPDATE user_states SET deleted_at = NOW()
                            WHERE id = ${payload.sid}`.trim()
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
                    const { token } =
                        await tooManySessionsLogin(app);

                    tempToken = token;

                    const service = app.get<JwtService>(JwtService);
                    const payload = service.decode(tempToken);
                    expect(payload.sid).toBeDefined();

                    const newHash = await cryptService.hash(
                        'invalid-hash'
                    );

                    await dataSource.query(
                        `UPDATE user_states SET data = jsonb_set(
                            data, '{tokenHash}', $1)
                            WHERE id = ${payload.sid}`.trim(),
                        [ JSON.stringify(newHash) ]
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
                'should deny access when the account is locked',
                async () => {
                    const user = await getUser(
                        app,
                        TEST_USERS[0].username
                    );

                    await lockUser(
                        app,
                        user
                    );

                    response = await login(
                        app,
                        TEST_USERS[0].username,
                        TEST_USERS[0].password,
                        401
                    );

                    expect(response.body.code)
                        .toEqual('INVALID_CREDENTIALS');

                    expect(response.body.details?.message)
                        .toEqual('Account is currently locked out');

                    await unlockUser(
                        app,
                        user
                    );
                }
            );
        });

        describe('DELETE /auth/sessions', () => {
            beforeAll(async () => {
                const { token, sessions } =
                    await tooManySessionsLogin(app);

                tempToken = token;
                activeSessions = sessions;
            });

            it(
                'should allow the user to delete one or more ' +
                'active sessions. Upon successful deletion, ' +
                'it should resolve the SESSION_LIMIT_REACHED state',
                async () => {
                    const payload = {
                        ids: [ 1, 4, 5 ]
                    };

                    expect(payload).toSatisfyApiSpec(
                        '/auth/sessions',
                        'DELETE'
                    );

                    const response =
                        await request(app.getHttpServer())
                            .delete('/auth/sessions')
                            .send(payload)
                            .set(
                                'Authorization',
                                `Bearer ${tempToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCES_DELETED');

                    expect(response.body.details?.session_ids)
                        .toEqual([ 1, 4 ]);

                    expect(response).toSatisfyApiSpec(
                        '/auth/sessions',
                        'DELETE'
                    );

                    const user = await getUser(
                        app,
                        TEST_USERS[0].username
                    );

                    expect(
                        user.hasState(
                            UserStateName.SESSION_LIMIT_REACHED
                        )
                    ).toBe(false);
                }
            );
        });

        describe('GET /auth/sessions/{id}', () => {
            beforeAll(async () => {
                configService.set(
                    'users.maxActiveSessions',
                    2
                );

                const { token, sessions } =
                    await tooManySessionsLogin(app);

                tempToken = token;
                activeSessions = sessions;
            });

            it(
                'should return session details for the ' +
                'provided session id using the temporary token',
                async () => {
                    const response =
                        await request(app.getHttpServer())
                            .get('/auth/sessions/2')
                            .set(
                                'Authorization',
                                `Bearer ${tempToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_FETCHED');

                    expect(response).toSatisfyApiSpec(
                        '/auth/sessions/{id}',
                        'GET'
                    );
                }
            );
        });

        describe('DELETE /auth/sessions/{id}', () => {
            it(
                'should delete the session corresponding ' +
                'with the provided id, and resolve the ' +
                'SESSION_LIMIT_REACHED state',
                async () => {
                    const response =
                        await request(app.getHttpServer())
                            .delete('/auth/sessions/2')
                            .set(
                                'Authorization',
                                `Bearer ${tempToken}`
                            ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_DELETED');

                    expect(response).toSatisfyApiSpec(
                        '/auth/sessions/{id}',
                        'DELETE'
                    );

                    const user = await getUser(
                        app,
                        TEST_USERS[0].username
                    );

                    expect(
                        user.hasState(
                            UserStateName.SESSION_LIMIT_REACHED
                        )
                    ).toBe(false);
                }
            );
        });
    });
});
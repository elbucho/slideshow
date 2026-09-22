import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '@/app/helpers/configure-app.helper';
import {
    login,
    getTokenAndPayload,
    getUser,
    addStateToUser
} from '@test/helpers/auth';
import { testExpand } from '@test/helpers/parameters';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AppModule } from '@/app/app.module';
import { UsersService } from '@/users/users.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { UserStateName } from '@/states/user-states.types';
import { TokenPayload } from '@/tokens/dtos/tokens.dto';

describe('Users', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let usersService: UsersService;
    let sessionsService: SessionsService;

    const createUserDto = {
        username: 'test-user',
        password: 'test-password',
        email: 'test@example.com'
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ],
            }).compile();

        dataSource = moduleFixture.get(DataSource);
        app = moduleFixture.createNestApplication();
        configureApp(app);

        sessionsService = app.get<SessionsService>(SessionsService);
        usersService = app.get<UsersService>(UsersService);

        await app.init();

        await dataSource.query(
            'TRUNCATE TABLE "sessions" RESTART IDENTITY CASCADE'
        );
        await dataSource.query(
            'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE'
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Public routes', () => {
        describe('POST /users', () => {
            it(
                'should allow anonymous access to user creation',
                async () => {
                    expect(createUserDto).toSatisfyApiSpec(
                        '/user',
                        'POST'
                    );

                    const response = await request(app.getHttpServer())
                        .post('/user')
                        .send(createUserDto)
                        .expect(201);

                    expect(response.body.code)
                        .toEqual('RESOURCE_CREATED');

                    expect(response).toSatisfyApiSpec(
                        '/user',
                        'POST'
                    );
                }
            );

            it(
                'should allow the user to login upon account creation',
                async () => {
                    for (const key of [ 'test-user', 'test@example.com' ]) {
                        const response = await login(
                            app,
                            key,
                            'test-password'
                        );

                        expect(response.body.code)
                            .toEqual('AUTHENTICATED');

                        expect(response.body.details.access_token)
                            .toBeDefined();
                    }
                }
            );

            it(
                'should return a VALIDATION_ERROR code if ' +
                'the payload isn\'t valid',
                async () => {
                    const payload = {
                        username: 'test-user',
                        password: 'test-password'
                    };

                    expect(payload).not.toSatisfyApiSpec(
                        '/user',
                        'POST'
                    );

                    const response = await request(app.getHttpServer())
                        .post('/user')
                        .send(payload)
                        .expect(400);

                    expect(response.body.code)
                        .toEqual('VALIDATION_ERROR');

                    expect(response).toSatisfyApiSpec(
                        '/user',
                        'POST'
                    );
                }
            );

            it(
                'should return a RESOURCE_ALREADY_EXISTS code ' +
                'if the user specifies an email or a username ' +
                'that is already extant',
                async () => {
                    for (const field of [ 'username', 'email' ]) {
                        const value = field === 'email' ?
                            'new-email@example.com' :
                            'new-test-user';

                        let payload = {
                            ...createUserDto
                        } as any;

                        payload[field] = value;

                        expect(payload).toSatisfyApiSpec(
                            '/user',
                            'POST'
                        );

                        const response = await request(app.getHttpServer())
                            .post('/user')
                            .send(payload)
                            .expect(409);

                        expect(response.body.code)
                            .toEqual('RESOURCE_ALREADY_EXISTS');

                        expect(response).toSatisfyApiSpec(
                            '/user',
                            'POST'
                        );
                    }
                }
            );
        });
    });

    describe('Access token required', () => {
        let accessToken: string;
        let tokenPayload: TokenPayload;

        beforeAll(async () => {
            const { token, payload } = await getTokenAndPayload(
                app,
                'access_token',
                createUserDto.username,
                createUserDto.password
            );

            accessToken = token;
            tokenPayload = payload;
        });

        describe('GET /user', () => {
            it(
                'should return the logged-in user\'s account',
                async () => {
                    const response = await request(app.getHttpServer())
                        .get('/user')
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        )
                        .expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_FETCHED');

                    expect(response).toSatisfyApiSpec(
                        '/user',
                        'GET'
                    );
                }
            );

            it(
                'should allow the user to pass in the "expand" ' +
                'parameter, with the appropriate string(s)',
                async () => {
                    // We need to have at least one state for the user
                    // for this test to succeed.
                    const user = await getUser(
                        app,
                        createUserDto.username
                    );

                    await addStateToUser(
                        app,
                        user,
                        UserStateName.PENDING_ACTIVATION
                    );

                    await testExpand(
                        app,
                        accessToken,
                        '/user',
                        'GET',
                        User
                    );
                }
            );
        });

        describe('PATCH /user', () => {
            it(
                'should update a user and revoke their session',
                async () => {
                    const response = await request(app.getHttpServer())
                        .patch('/user')
                        .send({
                            username: 'new-user'
                        })
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_UPDATED');

                    expect(response).toSatisfyApiSpec(
                        '/user',
                        'PATCH'
                    );

                    const session =
                        await sessionsService.findById(
                            tokenPayload.sid,
                            {
                                includeDeleted: true
                            }
                        ) as Session;

                    expect(session).toBeDefined();

                    expect(session.revokedAt)
                        .toEqual(expect.any(Date));

                    const user = await getUser(
                        app,
                        'new-user'
                    );

                    user.username = createUserDto.username;

                    await usersService.save(user);
                }
            );

            it(
                'should return a VALIDATION_ERROR code if ' +
                'the payload doesn\'t conform to the schema',
                async () => {
                    const payload = {
                        foo: 'bar'
                    };

                    expect(payload).not.toSatisfyApiSpec(
                        '/user',
                        'PATCH'
                    );

                    const response = await request(app.getHttpServer())
                        .patch('/user')
                        .send(payload)
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        ).expect(400);

                    expect(response.body.code)
                        .toEqual('VALIDATION_ERROR');

                    expect(response).toSatisfyApiSpec(
                        '/user',
                        'PATCH'
                    );
                }
            );

            it(
                'should return a RESOURCE_ALREADY_EXISTS code ' +
                'if the user tries to update either the username ' +
                'or email to one belonging to an extant user',
                async () => {
                    const { token, payload } =
                        await getTokenAndPayload(
                            app,
                            'access_token',
                            createUserDto.username,
                            createUserDto.password
                        );

                    accessToken = token;
                    tokenPayload = payload;

                    await usersService.createUser({
                        username: 'new-user',
                        email: 'new@example.com',
                        password: 'new-password'
                    });

                    for (const updatePayload of [
                        { username: 'new-user' },
                        { email: 'new@example.com' }
                    ]) {
                        expect(updatePayload).toSatisfyApiSpec(
                            '/user',
                            'PATCH'
                        );

                        const response = await request(app.getHttpServer())
                            .patch('/user')
                            .send(updatePayload)
                            .set(
                                'Authorization',
                                `Bearer ${accessToken}`
                            ).expect(409);

                        expect(response.body.code)
                            .toEqual('RESOURCE_ALREADY_EXISTS');

                        expect(response).toSatisfyApiSpec(
                            '/user',
                            'PATCH'
                        );
                    }
                }
            );
        });

        describe('DELETE /user', () => {
            it(
                'should delete the user account and ' +
                'revoke the session',
                async () => {
                    const response = await request(app.getHttpServer())
                        .delete('/user')
                        .set(
                            'Authorization',
                            `Bearer ${accessToken}`
                        ).expect(200);

                    expect(response.body.code)
                        .toEqual('RESOURCE_DELETED');

                    expect(response).toSatisfyApiSpec(
                        '/user',
                        'DELETE'
                    );

                    const session =
                        await sessionsService.findById(
                            tokenPayload.sid,
                            {
                                includeDeleted: true
                            }
                        );

                    expect(session?.deletedAt)
                        .toEqual(expect.any(Date));

                    const user =
                        await usersService.findById(
                            tokenPayload.sub,
                            {
                                includeDeleted: true
                            }
                        );

                    expect(user?.deletedAt)
                        .toEqual(expect.any(Date));
                }
            );
        });
    });
});
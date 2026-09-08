import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app/app.module';
import { TokensService } from '@/tokens/tokens.service';
import { AuditLog } from '@/database/entities/audit-log.entity';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import { APIResponse } from '@/common/types';
import { AuthTokens } from '@/tokens/dtos/tokens.dto';
import { seedTestUser } from '@test/seeds/user.seed';
import { login } from '@test/helpers/auth';
import { UsersService } from '@/users/users.service';
import { AuthEvents } from '@/events/auth.events';

describe('Auth', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let auditLogs: Repository<AuditLog>;
    let users: Repository<User>;
    let sessions: Repository<Session>;

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ],
            }).compile();

        dataSource = moduleFixture.get(DataSource);
        auditLogs = dataSource.getRepository(AuditLog);
        users = dataSource.getRepository(User);
        sessions = dataSource.getRepository(Session);

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new ErrorResponseFilter());

        const usersService = app.get<UsersService>(UsersService);

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
    })

    afterAll(async () => {
        await app.close();
    });

    describe('POST /auth/login', () => {
        it('should authenticate the user when proper credentials are supplied', async () => {
            for (const identifier of ['test-user', 'test@example.com']) {
                const response = await login(app, identifier) as APIResponse<AuthTokens>;

                expect(response.type).toBe('success');
                expect(response.code).toBe('AUTHENTICATED');
                expect(response.details.access_token).toBeDefined();
                expect(response.details.refresh_token).toBeDefined();
            }
        });

        it('should return a VALIDATION_ERROR code on invalid request', async() => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    username: 'test@example.com',
                })
                .expect(400);

            expect(response.body.type).toBe('error');
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.details.message).toBe(
                'The request body contains an invalid schema'
            );
        });

        it('should return an INVALID_CREDENTIALS code on incorrect login', async () => {
            const response = await login(
                app,
                'test@example.com',
                'wrong-password',
                401
            ) as APIResponse<Record<string, any>>;

            expect(response.type).toBe('error');
            expect(response.code).toBe('INVALID_CREDENTIALS');
            expect(response.details.message).toBe('Invalid username or password');
        });

        it('should lock the user account after 3 failed login attempts', async () => {
            await auditLogs.clear();

            for (let i=0;i<3;i++) {
                const response = await login(
                    app,
                    'test@example.com',
                    'wrong-password',
                    401
                ) as APIResponse<Record<string, any>>;

                expect(response.details.message).toBe('Invalid username or password');
            }

            const response = await login(
                app,
                'test@example.com',
                'test-password',
                401
            ) as APIResponse<Record<string, any>>;

            expect(response.details.message).toBe('Account is currently locked out');

            // Add a delay to ensure that the audit_logs record has been written
            await new Promise(resolve => setTimeout(resolve, 1000));

            const lastLog = await auditLogs.findOneBy({
                event: AuthEvents.LOCKED_USER_LOGIN_ATTEMPT
            });

            expect(lastLog).toBeDefined();
            expect(lastLog?.userId).toBe(1);
        });

        it('should allow the user to login after the last failed login attempt expires', async () => {
            await users.query(`
                UPDATE user_states
                SET expires_at = NOW() - INTERVAL '1 second'
                WHERE user_id = $1
            `, [1]);

            const response = await login(app) as APIResponse<AuthTokens>;

            expect(response.type).toBe('success');
            expect(response.code).toBe('AUTHENTICATED');
            expect(response.details.access_token).toBeDefined();
            expect(response.details.refresh_token).toBeDefined();
        });
    });

    describe('POST /auth/logout', () => {
        it('should log the user out', async () => {
            const loginResponse = await login(app) as APIResponse<AuthTokens>;

            const response = await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', `Bearer ${loginResponse.details.access_token}`)
                .expect(200);

            expect(response.body.code).toEqual('LOGGED_OUT');
            expect(response.body.details).toEqual({});
        });

        it(
            'should return an INVALID_CREDENTIALS code when a ' +
            'malformed accessToken is provided',
            async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/logout')
                    .set('Authorization', 'Bearer ' + 'incorrect-token')
                    .expect(401);

                expect(response.body.code).toEqual('INVALID_CREDENTIALS');
                expect(response.body.details.message).toEqual('Invalid token');
            }
        );

        it('should return a SESSION_NOT_FOUND code if the token ' +
            'provided doesn\'t contain a valid sid',
            async () => {
                await sessions.clear();
                await login(app);

                const lastSession = await sessions.findOneBy({
                    userId: 1
                }) as Session;

                const tokensService = app.get<TokensService>(TokensService);
                const badToken = tokensService.createAuthToken(
                    'access',
                    lastSession
                );

                const response = await request(app.getHttpServer())
                    .post('/auth/logout')
                    .set('Authorization', `Bearer ${badToken}`)
                    .expect(401);

                expect(response.body.code).toEqual('SESSION_NOT_FOUND');
                expect(response.body.details.message).toEqual('Invalid token');
            }
        );
    });

    describe('POST /auth/refresh', () => {
        it('should refresh the access token', async () => {
            const loginResponse = await login(app) as APIResponse<AuthTokens>;

            const response = await request(app.getHttpServer())
                .post('/auth/refresh')
                .set('Authorization', 'Bearer ' + loginResponse.details.refresh_token)
                .expect(200);

            expect(response.body.code).toEqual('TOKENS_REFRESHED')
            expect(response.body.details.access_token).toBeDefined();
            expect(response.body.details.refresh_token).toBeDefined();
        });

        it(
            'should return an INVALID_CREDENTIALS code when a ' +
            'malformed refreshToken is provided',
            async () => {
                const response = await request(app.getHttpServer())
                    .post('/auth/refresh')
                    .set('Authorization', 'Bearer ' + 'incorrect-token')
                    .expect(401);

                expect(response.body.code).toEqual('INVALID_CREDENTIALS');
                expect(response.body.details.message).toEqual('Invalid token');
            }
        );

        it(
            'should return a SESSION_NOT_FOUND code if the token ' +
            'provided doesn\'t match the one stored in the db',
            async () => {
                await sessions.clear();
                await login(app);

                const lastSession = await sessions.findOneBy({
                    userId: 1
                }) as Session;

                const tokensService = app.get<TokensService>(TokensService);
                const badToken = tokensService.createAuthToken(
                    'refresh',
                    lastSession
                );

                const response = await request(app.getHttpServer())
                    .post('/auth/refresh')
                    .set('Authorization', `Bearer ${badToken}`)
                    .expect(401);

                expect(response.body.code).toEqual('SESSION_NOT_FOUND');
                expect(response.body.details.message).toEqual('Invalid token');
            }
        );
    });
});
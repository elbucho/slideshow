import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';
import { Session } from '@/database/entities/session.entity';
import { User } from '@/database/entities/user.entity';
import { AuthService } from '@/auth/auth.service';
import {
    seedTestUsers,
    seedTestSessions
} from './seeds/auth-sessions.seed';

describe('Auth-Sessions', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let users: Repository<User>;
    let sessions: Repository<Session>;
    let authService: AuthService;
    let accessTokens: string[];

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [ AppModule ]
            }).compile();

        dataSource = moduleFixture.get(DataSource);
        users = dataSource.getRepository(User);
        sessions = dataSource.getRepository(Session);

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new ErrorResponseFilter());

        await app.init();

        authService = app.get<AuthService>(AuthService);

        await seedTestUsers(users);
        accessTokens = await seedTestSessions(
            sessions,
            authService
        );
    });

    afterAll(async() => {
        await app.close();
    });

    describe('GET /auth/sessions', () => {
        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .get('/auth/sessions')
                .expect(401);
        });

        it(
            'should return an array of the active sessions ' +
            'for the logged-in user',
            async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/sessions')
                    .set('Authorization', `Bearer ${accessTokens[2]}`)
                    .expect(200);

                expect(response.body.message).toEqual('Sessions fetched');
                expect(response.body.data.length).toEqual(4);
            }
        );

        it('should allow sorting by field', async () => {
            const response1 = await request(app.getHttpServer())
                .get('/auth/sessions')
                .query({
                    sort: [ 'user_agent' ]
                })
                .set('Authorization', `Bearer ${accessTokens[0]}`)
                .expect(200);

            expect(response1.body.message).toEqual('Sessions fetched');
            expect(response1.body.data.length).toEqual(4);
            expect(response1.body.data[0].userAgent).toEqual('AppleWebKit/537.36');
            expect(response1.body.data[3].userAgent).toEqual('Mozilla/5.0');

            const response2 = await request(app.getHttpServer())
                .get('/auth/sessions')
                .query({
                    sort: [ '-id' ]
                })
                .set('Authorization', `Bearer ${accessTokens[0]}`)
                .expect(200);

            expect(response2.body.message).toEqual('Sessions fetched');
            expect(response2.body.data.length).toEqual(4);
            expect(response1.body.data[0].id).toEqual(4);
            expect(response1.body.data[3].id).toEqual(1);
        });

        it('should allow for pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/sessions')
                .query({
                    page: 2,
                    page_size: 2
                })
                .set('Authorization', `Bearer ${accessTokens[0]}`)
                .expect(200);

            expect(response.body.message).toEqual('Sessions fetched');
            expect(response.body.data.length).toEqual(2);
            expect(response.body.data[0].id).toEqual(3);
            expect(response.body.data[1].id).toEqual(4);
        });
    });

    describe('DELETE /auth/sessions', () => {
        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .delete('/auth/sessions')
                .expect(401);
        });

        it(
            'should delete all of the sessions in ' +
            'the provided array, only if they belong to user',
            async () => {
                const response = await request(app.getHttpServer())
                    .delete('/auth/sessions')
                    .send({
                        ids: [
                            4, 5, 6
                        ]
                    })
                    .set('Authorization', `Bearer ${accessTokens[1]}`)
                    .expect(200);

                expect(response.body.message).toEqual('Active sessions deleted successfully');
                expect(response.body.data.session_ids).toBeDefined();
                expect(response.body.data.session_ids).toEqual([4]);

                const remainingSessions = await sessions.countBy({
                    deletedAt: undefined
                });

                expect(remainingSessions).toEqual(3);
            }
        );
    });

    describe('GET /auth/sessions/{id}', () => {
        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .get('/auth/sessions/1')
                .expect(401);
        });

        it('should return the session associated with id', async() => {
            const response = await request(app.getHttpServer())
                .get('/auth/sessions/2')
                .set('Authorization', `Bearer ${accessTokens[0]}`)
                .expect(200);

            expect(response.body.message).toEqual('Session fetched');
            expect(response.body.data.id).toEqual(2);
        });

        it(
            'should return a RESOURCE_NOT_FOUND code if the ' +
            'session id doesn\'t exist in the database',
            async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/sessions/14')
                    .set('Authorization', `Bearer ${accessTokens[2]}`)
                    .expect(404);

                expect(response.body.error.message).toEqual(
                    'Unable to locate the requested resource'
                );
                expect(response.body.error.code).toEqual('RESOURCE_NOT_FOUND');
            }
        );

        it(
            'should return a RESOURCE_NOT_FOUND code if the ' +
            'session exists, but is deleted',
            async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/sessions/4')
                    .set('Authorization', `Bearer ${accessTokens[2]}`)
                    .expect(404);

                expect(response.body.error.message).toEqual(
                    'Unable to locate the requested resource'
                );
                expect(response.body.error.code).toEqual('RESOURCE_NOT_FOUND');
            }
        );

        it(
            'should return an INSUFFICIENT_PERMISSIONS code ' +
            'if the active user doesn\'t own the requested session',
            async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/sessions/5')
                    .set('Authorization', `Bearer ${accessTokens[2]}`)
                    .expect(403);

                expect(response.body.error.message).toEqual(
                    'You do not have the required permissions for that action'
                );
                expect(response.body.error.code).toEqual('INSUFFICIENT_PRIVILEGES');
                expect(response.body.error.details).toEqual({
                    action: 'GET',
                    resource: '/auth/sessions/5'
                });
            }
        );
    });

    describe('DELETE /auth/sessions/{id}', () => {
        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .delete('/auth/sessions/1')
                .expect(401);
        });

        it('should delete a session if the user has permission', async () => {
            const response = await request(app.getHttpServer())
                .delete('/auth/sessions/1')
                .set('Authorization', `Bearer ${accessTokens[0]}`)
                .expect(200);

            expect(response.body.message).toEqual(
                'The session was deleted successfully'
            );
            expect(response.body.data).toEqual({
                session_id: 1
            });
        });

        it(
            'should return a RESOURCE_NOT_FOUND code if ' +
            'the session exists, but is already deleted',
            async () => {
                const response = await request(app.getHttpServer())
                    .delete('/auth/sessions/1')
                    .set('Authorization', `Bearer ${accessTokens[1]}`)
                    .expect(404);

                expect(response.body.error.message).toEqual(
                    'Unable to locate the requested resource'
                );
                expect(response.body.error.code).toEqual(
                    'RESOURCE_NOT_FOUND'
                );
            }
        );

        it(
            'should return a RESOURCE_NOT_FOUND code if ' +
            'the session doesn\'t exist',
            async () => {
                const response = await request(app.getHttpServer())
                    .delete('/auth/sessions/15')
                    .set('Authorization', `Bearer ${accessTokens[1]}`)
                    .expect(404);

                expect(response.body.error.message).toEqual(
                    'Unable to locate the requested resource'
                );
                expect(response.body.error.code).toEqual(
                    'RESOURCE_NOT_FOUND'
                );
            }
        );

        it(
            'should return an INSUFFICIENT_PERMISSIONS code ' +
            'if the active user doesn\'t own the requested session',
            async () => {
                const response = await request(app.getHttpServer())
                    .delete('/auth/sessions/5')
                    .set('Authorization', `Bearer ${accessTokens[1]}`)
                    .expect(403);

                expect(response.body.error.message).toEqual(
                    'You do not have the required permissions for that action'
                );
                expect(response.body.error.code).toEqual('INSUFFICIENT_PRIVILEGES');
                expect(response.body.error.details).toEqual({
                    action: 'DELETE',
                    resource: '/auth/sessions/5'
                });
            }
        );
    });
});
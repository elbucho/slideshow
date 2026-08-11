import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app/app.module';
import { seedTestUser } from '@test/seeds/user.seed';
import { login } from '@test/helpers/auth';
import { User } from '@/database/entities/user.entity';

describe('Auth', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let user: User;

    beforeAll(async () => {
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
                imports: [AppModule],
            }).compile();

        app = moduleFixture.createNestApplication();

        await app.init();

        dataSource = moduleFixture.get(DataSource);
        user = await seedTestUser(dataSource);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /auth/login', () => {
        it('should authenticate the user when proper credentials are supplied', async () => {
            const tokens = await login(app);

            expect(tokens.access_token).toBeDefined();
            expect(tokens.refresh_token).toBeDefined();
        });

        it('should return a VALIDATION_ERROR code on invalid request', async() => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
            expect(response.body.error.code).toEqual('VALIDATION_ERROR');
            expect(response.body.error.message).toEqual('The request body contains an invalid schema');
        });

        it('should return an INVALID_CREDENTIALS code on incorrect login', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrong-password'
                })
                .expect(401);

            expect(response.body.error).toBeDefined();
            expect(response.body.error.code).toEqual('INVALID_CREDENTIALS');
            expect(response.body.error.message).toEqual('Invalid email or password');
        });
    });

    describe('POST /auth/logout', () => {
        it('should log the user out', async () => {
            const tokens = await login(app);

            const response = await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', 'Bearer ' + tokens.access_token)
                .expect(200);

            expect(response.body.message).toEqual('Logout successful');
            expect(response.body.data).toEqual({});
        });

        it('should return an INVALID_CREDENTIALS code when an incorrect accessToken is provided', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', 'Bearer ' + 'incorrect-token')
                .expect(401);

            expect(response.body.error.code).toEqual('INVALID_CREDENTIALS');
            expect(response.body.error.message).toEqual('Invalid user credentials provided');
        });
    });

    describe('POST /auth/refresh', () => {
        it('should refresh the access token', async () => {
            const tokens = await login(app);

            const response = await request(app.getHttpServer())
                .post('/auth/refresh')
                .set('Authorization', 'Bearer ' + tokens.refresh_token)
                .expect(200);

            expect(response.body.data.access_token).toBeDefined();
            expect(response.body.data.refresh_token).toBeDefined();
        });

        it('should return an INVALID_CREDENTIALS code when an incorrect accessToken is provided', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/refresh')
                .set('Authorization', 'Bearer ' + 'incorrect-token')
                .expect(401);

            expect(response.body.error.code).toEqual('INVALID_CREDENTIALS');
            expect(response.body.error.message).toEqual('Invalid user credentials provided');
        });
    });

})
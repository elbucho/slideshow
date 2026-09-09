import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { TEST_USER } from '@test/seeds/user.seed';

export async function login(
    app: INestApplication,
    username?: string,
    password?: string,
    code?: number
): Promise<request.Response> {
    return request(app.getHttpServer())
        .post('/auth/login')
        .send({
            username: username ?? TEST_USER.username,
            password: password ?? TEST_USER.password
        })
        .expect(code ?? 200);
}
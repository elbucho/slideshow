import request from 'supertest';
import type { INestApplication } from '@nestjs/common';


export const TEST_USER = {
    username: 'test@example.com',
    password: 'test-password'
}

export async function login(
    app: INestApplication,
    username?: string,
    password?: string,
    code?: number
): Promise<request.Response> {
//): Promise<APIResponse<TokenUnion>> {
    return request(app.getHttpServer())
        .post('/auth/login')
        .send({
            username: username ?? TEST_USER.username,
            password: password ?? TEST_USER.password
        })
        .expect(code ?? 200);
}
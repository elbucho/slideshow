import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { AuthTokens } from '@/auth/dtos/tokens.dto';

export const TEST_USER = {
    email: 'test@example.com',
    password: 'test-password'
}

export async function login(
    app: INestApplication,
    email?: string,
    password?: string
): Promise<AuthTokens> {
    const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
            email: email ?? TEST_USER.email,
            password: password ?? TEST_USER.password
        })
        .expect(200);

    return response.body.data;
}
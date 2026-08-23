import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { APIResponse } from '@/common/types';
import type { AuthTokens } from '@/auth/dtos/tokens.dto';

export const TEST_USER = {
    username: 'test@example.com',
    password: 'test-password'
}

export async function login(
    app: INestApplication,
    username?: string,
    password?: string,
    code?: number
): Promise<APIResponse<Record<string, any>>> {
    const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
            username: username ?? TEST_USER.username,
            password: password ?? TEST_USER.password
        })
        .expect(code ?? 200);

    return response.body as APIResponse<AuthTokens> | APIResponse<Record<string, any>>;
}
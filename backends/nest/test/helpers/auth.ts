import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TEST_USER } from '@test/seeds/user.seed';
import { TokenPayload } from '@/tokens/dtos/tokens.dto';

interface TokenAndPayload {
    token: string;
    payload: TokenPayload;
}

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

export async function getTokenAndPayload(
    app: INestApplication,
    tokenPath: string,
    username?: string,
    password?: string,
): Promise<TokenAndPayload> {
    const jwtService = app.get<JwtService>(JwtService);
    const loginResponse = await login(
        app,
        username,
        password,
        200
    );

    const token: string =
        loginResponse.body.details?.[tokenPath];

    expect(token).toBeDefined();

    const payload: TokenPayload =
        jwtService.decode(
            token
        );

    expect(payload).toEqual(
        expect.objectContaining({
            sub: expect.any(Number),
            sid: expect.any(Number)
        })
    );

    return {
        token,
        payload
    };
}
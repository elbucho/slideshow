import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TEST_USER } from '@test/seeds/user.seed';
import { TokenPayload } from '@/tokens/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { SecurityService } from '@/auth/security/security.service';
import { UserStateName } from '@/states/user-states.types';

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
        }).expect(code ?? 200);
}

export async function getUser(
    app: INestApplication,
    username?: string
): Promise<User> {
    const service = app.get<UsersService>(UsersService);
    const identifier = username ?? TEST_USER.username;

    return service.findByUsernameOrEmail(
        identifier,
        true
    );
}

export async function lockUser(
    app: INestApplication,
    user: User
): Promise<void> {
    const service = app.get<SecurityService>(SecurityService);

    await service.lockUser(
        user,
        {
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent'
        }
    );
}

export async function unlockUser(
    app: INestApplication,
    user: User
): Promise<void> {
    const service = app.get<UsersService>(UsersService);

    await service.resolveState(
        user,
        UserStateName.ACCOUNT_LOCKED
    );
}

export async function addStateToUser(
    app: INestApplication,
    user: User,
    state: UserStateName
): Promise<void> {
    const service = app.get<UsersService>(UsersService);

    await service.setState(user, state);
}

export async function resolveState(
    app: INestApplication,
    user: User,
    state: UserStateName
): Promise<void> {
    const service = app.get<UsersService>(UsersService);

    await service.resolveState(user, state);
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
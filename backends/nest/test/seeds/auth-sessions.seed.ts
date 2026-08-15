import { Repository } from 'typeorm';
import { Response } from 'express';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AuthService } from '@/auth/auth.service';

export async function seedTestUsers(
    users: Repository<User>
): Promise<void> {
    const user1 = users.create({
        email: 'test@example.com'
    });

    await user1.setPassword('test-password');
    await users.save(user1);

    const user2 = users.create({
        email: 'test@another-example.com'
    });

    await user2.setPassword('test-password');
    await users.save(user2);
}

export async function seedTestSessions(
    sessions: Repository<Session>,
    authService: AuthService
): Promise<string[]> {
    const refreshTimeoutMs = Number(
        process.env.JWT_REFRESH_TIMEOUT ??
        30 * 24 * 60 * 60 * 1000
    );

    const userAgents = [
        'Mozilla/5.0',
        'DuckDuckBot/1.0',
        'curl/7.68.0',
        'AppleWebKit/537.36'
    ];

    const response = {
        cookie: jest.fn()
    } as any as jest.Mocked<Response>;

    const user1 = {
        id: 1
    } as any as User;

    let i = 1;
    let accessTokens: string[] = [];

    for (const agent of userAgents) {
        const session = sessions.create({
            userId: 1,
            userAgent: agent,
            ipAddress: `127.0.0.${i++}`
        });

        const token = authService.createRefreshToken(
            user1,
            session,
            response
        );

        accessTokens.push(authService.createAccessToken(
            user1,
            session,
            response
        ));

        await session.setToken(token);
        session.tokenExpiresAt = new Date(Date.now() + refreshTimeoutMs);

        await sessions.save(session);
    }

    const user2 = {
        id: 2
    } as any as User;

    const session = sessions.create({
        userId: 2,
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.15'
    });

    const token = authService.createRefreshToken(
        user2,
        session,
        response
    );

    await session.setToken(token);
    session.tokenExpiresAt = new Date(
        Date.now() + refreshTimeoutMs
    );

    await sessions.save(session);

    return accessTokens;
}
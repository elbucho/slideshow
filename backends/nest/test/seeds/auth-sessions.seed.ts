import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { TokensService } from '@/tokens/tokens.service';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';

export async function seedTestUsers(
    usersService: UsersService
): Promise<void> {
    await usersService.createUser({
        email: 'test@example.com',
        username: 'test_user_1',
        password: 'test-password'
    });

    await usersService.createUser({
        email: 'test@another-example.com',
        username: 'test_user_2',
        password: 'test-password'
    });
}

export async function seedTestSessions(
    sessionsService: SessionsService,
    tokensService: TokensService
): Promise<string[]> {
    const userAgents = [
        'Mozilla/5.0',
        'DuckDuckBot/1.0',
        'curl/7.68.0',
        'AppleWebKit/537.36'
    ];

    const user1 = {
        id: 1
    } as any as User;

    let i = 1;
    let accessTokens: string[] = [];

    for (const agent of userAgents) {
        const context: AuthContext = {
            ipAddress: `127.0.0.${i++}`,
            userAgent: agent
        };

        const session =
            await sessionsService.create(
                user1.id,
                context
            );

        const result =
            await tokensService.createAuthTokens(
                session
            );

        if (result.type === 'authenticated')
            accessTokens.push(result.tokens.access_token);
    }

    const user2 = {
        id: 2
    } as any as User;

    const session = await sessionsService.create(
        user2.id,
        {
            userAgent: 'Mozilla/5.0',
            ipAddress: '127.0.0.15'
        }
    );

    await tokensService.createAuthTokens(session);

    return accessTokens;
}
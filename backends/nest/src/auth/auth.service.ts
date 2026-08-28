import { Injectable } from '@nestjs/common';
import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { SessionsService } from './sessions/sessions.service';
import { UserStatesService } from '@/states/user-states.service';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { TokensService } from '@/tokens/tokens.service';
import { UserStates } from '@/states/user.states';
import { LoginResult } from '@/common/types';

@Injectable()
export class AuthService {
    constructor (
        private readonly usersService: UsersService,
        private readonly sessionsService: SessionsService,
        private readonly userStatesService: UserStatesService,
        private readonly tokensService: TokensService
    ) { }

    async login(
        user: User,
        context: AuthContext
    ): Promise<LoginResult> {
        let session =
            await this.sessionsService.findCurrentUserSession(
                user,
                context
            );

        if (!session) {
            const sessionLimitExceeded =
                await this.sessionsService.checkIfSessionLimitExceeded(
                    user,
                    context
                );

            if (sessionLimitExceeded) {
                const sessions =
                    await this.sessionsService.findActiveUserSessions(
                        user
                    );

                await this.userStatesService.resolveStates(
                    user,
                    [ UserStates.SESSION_LIMIT_EXCEEDED ]
                );

                return this.tokensService.createSessionLimitToken(
                    user,
                    sessions,
                    context
                );
            }

            session =
                await this.sessionsService.create(
                    user,
                    context
                );
        }

        return this.tokensService.createAuthTokens(session);
    }

    async logout(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<void> {
        await this.sessionsService.terminate(
            authUser,
            context
        );
    }

    async authenticateCredentials(
        identifier: string,
        password: string,
        context: AuthContext
    ): Promise<User> {
        const user =
            await this.usersService.findByUsernameOrEmail(
                identifier,
                true
            );

        await this.usersService.verifyNotLocked(
            user,
            context
        );

        await this.usersService.verifyPasswordMatches(
            user,
            password,
            context
        );

        return user;
    }

    async authenticateRefreshToken(
        token: string,
        authUser: AuthUser,
        context: AuthContext
    ): Promise<User> {
        const session =
            await this.sessionsService.findById(
                authUser.sessionId,
                true
            );

        await this.sessionsService.verifyTokenMatches(
            session,
            token,
            context
        );

        await this.sessionsService.verifyNotExpired(
            session,
            context
        );

        await this.usersService.verifyNotLocked(
            session.user,
            context
        );

        return session.user;
    }

    async authenticateTemporaryToken(
        token: string,
        authUser: AuthUser,
        context: AuthContext
    ): Promise<User> {
        const userState =
            await this.userStatesService.findById(
                authUser.sessionId,
                true
            );

        await this.userStatesService.verifyTokenMatches(
            userState,
            token,
            context
        );

        await this.usersService.verifyNotLocked(
            userState.user,
            context
        );

        return userState.user;
    }
}
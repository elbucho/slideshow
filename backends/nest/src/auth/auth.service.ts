import { Injectable } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { SessionsService } from './sessions/sessions.service';
import { UserStatesService } from '@/states/user-states.service';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { TokensService } from '@/tokens/tokens.service';
import { UserStateName } from '@/states/user-states.types';
import { LoginResponseUnion } from '@/auth/types';

@Injectable()
export class AuthService {
    constructor (
        private readonly usersService: UsersService,
        private readonly sessionsService: SessionsService,
        private readonly userStatesService: UserStatesService,
        private readonly tokensService: TokensService
    ) { }

    async login(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<LoginResponseUnion> {
        let session =
            await this.sessionsService.findCurrentUserSession(
                authUser,
                context
            );

        // If we already have an active session for this user
        // (matching IP address / user agent), return that.
        if (session) {
            return this.sessionsService.markLastActive(
                session
            ).then(
                (session) =>
                    this.tokensService.createAuthTokens(
                        session
                    )
            );
        }

        // Determine whether the user has reached the limit of
        // concurrent active sessions allowed
        const activeSessions =
            await this.sessionsService.findActiveUserSessions(
                authUser
            );

        const sessionLimitReached =
            await this.sessionsService.checkIfSessionLimitReached(
                authUser.userId,
                activeSessions.items.length,
                context
            );

        if (sessionLimitReached) {
            // Resolve any active SESSION_LIMIT_REACHED states
            // so we can replace them with a new one.
            await this.userStatesService.resolveStates(
                authUser.userId,
                [ UserStateName.SESSION_LIMIT_REACHED ]
            );

            return this.tokensService.createSessionLimitToken(
                authUser.userId,
                activeSessions.items,
                context
            );
        }

        // The user is below the limit. Create a new session and
        // log them in with it.
        return this.sessionsService.create(
            authUser.userId,
            context
        ).then(
            (session) =>
                this.tokensService.createAuthTokens(
                    session
                )
        );
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
    ): Promise<AuthUser> {
        const user =
            await this.usersService.findByUsernameOrEmail(
                identifier,
                true
            );

        await this.usersService.verifyPasswordMatches(
            user,
            password,
            context
        );

        await this.usersService.verifyNotLocked(
            user,
            context
        );

        return {
            userId: user.id
        };
    }

    async authenticateRefreshToken(
        token: string,
        authUser: AuthUser,
        context: AuthContext
    ): Promise<AuthUser> {
        const session =
            await this.sessionsService.findByAuthUser(
                authUser,
                context,
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

        return {
            userId: session.user.id,
            sessionId: session.id
        };
    }

    async authenticateTemporaryToken(
        token: string,
        authUser: AuthUser,
        context: AuthContext
    ): Promise<AuthUser> {
        const userState =
            await this.userStatesService.findByAuthUser(
                authUser,
                context,
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

        return {
            userId: userState.user.id,
            sessionId: userState.id
        }
    }
}
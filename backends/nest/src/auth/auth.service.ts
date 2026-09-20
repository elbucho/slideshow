import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionsService } from './sessions/sessions.service';
import { UserStatesService } from '@/states/user-states.service';
import { AuthContext } from '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { TokensService } from '@/tokens/tokens.service';
import { UserStateName } from '@/states/user-states.types';
import { LoginResponseUnion } from '@/auth/types';
import { SessionRevokedException } from '@/common/exceptions';
import {
    AuthEvents,
    SessionIpMismatchEvent,
    SessionUserAgentMismatchEvent
} from '@/events/auth.events';

@Injectable()
export class AuthService {
    constructor (
        private readonly sessionsService: SessionsService,
        private readonly userStatesService: UserStatesService,
        private readonly tokensService: TokensService,
        private readonly eventEmitter: EventEmitter2
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

    async refresh(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<LoginResponseUnion> {
        let session =
            await this.sessionsService.findByAuthUser(
                authUser,
                context
            );

        let ipMismatch = false;
        let uaMismatch = false;

        if (session.ipAddress !== context.ipAddress) {
            ipMismatch = true;

            await this.eventEmitter.emitAsync(
                AuthEvents.SESSION_IP_MISMATCH,
                new SessionIpMismatchEvent(
                    authUser.userId,
                    authUser.sessionId as number,
                    context.userAgent,
                    session.ipAddress,
                    context.ipAddress
                )
            );
        }

        if (session.userAgent !== context.userAgent) {
            uaMismatch = true;

            await this.eventEmitter.emitAsync(
                AuthEvents.SESSION_UA_MISMATCH,
                new SessionUserAgentMismatchEvent(
                    authUser.userId,
                    authUser.sessionId as number,
                    context.ipAddress,
                    session.userAgent,
                    context.userAgent
                )
            );
        }

        if (ipMismatch && uaMismatch) {
            await this.sessionsService.revoke(
                session,
                context,
                'AUTO',
                'IP Address and User Agent both changed ' +
                    'between refreshes'
            );

            throw new SessionRevokedException(
                'Session revoked due to suspicious ' +
                'activity'
            );
        }

        return this.login(authUser, context);
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
}
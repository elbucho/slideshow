import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Session } from '@/database/entities/session.entity';
import { AuthEvents, TempTokenGrantedEvent } from '@/events/auth.events';
import { UserLoggedInEvent } from '@/events/auth.events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { UserState } from '@/database/entities/user-state.entity';
import { User } from '@/database/entities/user.entity';
import { AuthContext } from '@/auth/auth-context.decorator';
import { UserStates } from '@/states/user.states';
import { UserStatesService } from '@/states/user-states.service';
import { LoginResult } from '@/common/types';

@Injectable()
export class TokensService {
    constructor(
        private readonly sessionsService: SessionsService,
        private readonly userStatesService: UserStatesService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly jwtService: JwtService
    ) {}

    async createAuthTokens(
        session: Session
    ): Promise<LoginResult> {
        const accessToken = this.createAuthToken(
            'access',
            session
        );

        const refreshToken = this.createAuthToken(
            'refresh',
            session
        );

        const refreshTimeoutMs =
            this.configService.get(
                'jwt.refresh.timeoutMs'
            );

        session = await this.sessionsService.setToken(
            session,
            refreshToken,
            new Date(
                Date.now() + refreshTimeoutMs
            )
        );

        await this.eventEmitter.emitAsync(
            AuthEvents.LOGGED_IN,
            new UserLoggedInEvent(
                session.userId,
                session.id,
                session.ipAddress,
                session.userAgent
            )
        );

        return {
            type: 'authenticated',
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken
            }
        };
    }

    async createSessionLimitToken(
        user: User,
        context: AuthContext
    ): Promise<LoginResult> {
        let userState = await this.userStatesService.create(
            user,
            UserStates.SESSION_LIMIT_EXCEEDED
        );

        const tempToken = this.createTempToken(
            userState
        );

        const timeoutMs =
            this.configService.get(
                'jwt.temp.timeoutMs'
            );

        userState = await this.userStatesService.setToken(
            userState,
            tempToken,
            new Date(
                Date.now() + timeoutMs
            )
        );

        await this.eventEmitter.emitAsync(
            AuthEvents.TEMP_TOKEN_GRANTED,
            new TempTokenGrantedEvent(
                userState.userId,
                userState.id,
                context.ipAddress,
                context.userAgent
            )
        );

        return {
            type: 'session_limit_exceeded',
            token: tempToken
        };
    }

    createAuthToken(
        type: 'access'|'refresh',
        session: Session
    ): string {
        const secret = this.configService.get(
            `jwt.${type}.secret`
        );

        const timeoutMs = this.configService.get(
            `jwt.${type}.timeoutMs`
        );

        return this.jwtService.sign({
            sub: session.userId,
            sid: session.id,
            type: type
        }, {
            secret: secret,
            expiresIn: `${timeoutMs}ms`,
            jwtid: randomUUID()
        });
    }

    createTempToken(
        userState: UserState
    ): string {
        const secret = this.configService.get(
            'jwt.temp.secret'
        );

        const timeoutMs = this.configService.get(
            'jwt.temp.timeoutMs'
        );

        return this.jwtService.sign({
            sub: userState.userId,
            sid: userState.id,
            type: 'temp'
        }, {
            secret: secret,
            expiresIn: `${timeoutMs}ms`,
            jwtid: randomUUID()
        });
    }
}
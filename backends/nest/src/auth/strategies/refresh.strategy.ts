import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { RefreshTokenPayload } from '@/tokens/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';
import {
    BaseException,
    InternalServerErrorException,
    ResourceNotFoundException,
    SessionNotFoundException
} from '@/common/exceptions';
import {
    AuthEvents,
    SessionNotFoundEvent,
    UnknownServerErrorEvent
} from '@/events/auth.events';
import { createAuthContextFromRequest } from '@/auth/auth-context.decorator';

@Injectable()
export class RefreshStrategy extends PassportStrategy(
    Strategy,
    'refresh'
) {
    constructor(
        private readonly authService: AuthService,
        private readonly eventEmitter: EventEmitter2,
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                ExtractJwt.fromAuthHeaderAsBearerToken()(request),
            secretOrKey: configService.get('jwt.refresh.secret') as string,
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        payload: RefreshTokenPayload
    ): Promise<User> {
        const context = createAuthContextFromRequest(request);
        const token =
            ExtractJwt.fromAuthHeaderAsBearerToken()(request) as string;

        try {
            return await this.authService.authenticateRefreshToken(
                token,
                {
                    userId: payload.sub,
                    sessionId: payload.sid
                },
                context
            );
        } catch (exception: any) {
            if (exception instanceof BaseException) {
                if (exception instanceof ResourceNotFoundException) {
                    await this.eventEmitter.emitAsync(
                        AuthEvents.SESSION_NOT_FOUND,
                        new SessionNotFoundEvent(
                            payload.sub,
                            payload.sid,
                            context.ipAddress,
                            context.userAgent
                        )
                    );

                    throw new SessionNotFoundException(
                        'Invalid token'
                    );
                }

                throw exception;
            } else {
                await this.eventEmitter.emitAsync(
                    AuthEvents.UNKNOWN_SERVER_ERROR,
                    new UnknownServerErrorEvent(
                        `User id: ${payload.sub}`,
                        context.ipAddress,
                        exception
                    )
                );

                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error'
                );
            }
        }
    }
}

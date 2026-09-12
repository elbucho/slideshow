import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { TokensMixin } from './tokens.mixin';
import { SecurityService } from '@/auth/security/security.service';
import { RefreshTokenPayload } from '@/tokens/dtos/tokens.dto';
import {
    BaseException,
    InternalServerErrorException,
    InvalidCredentialsException
} from '@/common/exceptions';
import {
    AuthEvents,
    UnknownServerErrorEvent
} from '@/events/auth.events';
import { createAuthContextFromRequest } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';

@Injectable()
export class RefreshStrategy extends TokensMixin(
    PassportStrategy(
        Strategy,
        'refresh'
    )
) {
    constructor(
        private readonly securityService: SecurityService,
        private readonly eventEmitter: EventEmitter2,
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: RefreshStrategy.extractToken,
            secretOrKey: configService.get(
                'jwt.refresh.secret'
            ) as string,
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        payload: RefreshTokenPayload
    ): Promise<AuthUser> {
        const context = createAuthContextFromRequest(request);
        const token = RefreshStrategy.extractToken(request);

        if (!payload.sid) {
            throw new InvalidCredentialsException(
                'Invalid token'
            );
        }

        try {
            return await this.securityService.verifyRefreshToken(
                token,
                {
                    userId: payload.sub,
                    sessionId: payload.sid
                },
                context
            );
        } catch (exception: any) {
            if (exception instanceof BaseException) {
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

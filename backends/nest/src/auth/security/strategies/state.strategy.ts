import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { SecurityService } from '@/auth/security/security.service';
import { TempTokenPayload } from '@/tokens/dtos/tokens.dto';
import { TokensMixin } from './tokens.mixin';
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
export class StateStrategy extends TokensMixin(
    PassportStrategy(
        Strategy,
        'state'
    )
) {
    constructor(
        private readonly securityService: SecurityService,
        private readonly eventEmitter: EventEmitter2,
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: StateStrategy.extractToken,
            secretOrKey: configService.get(
                'jwt.temp.secret'
            ) as string,
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        payload: TempTokenPayload
    ): Promise<AuthUser> {
        const context = createAuthContextFromRequest(request);
        const token = StateStrategy.extractToken(request);

        if (!payload.sid) {
            throw new InvalidCredentialsException(
                'Invalid token'
            );
        }

        try {
            return await this.securityService.verifyTemporaryToken(
                token,
                payload.sub,
                payload.sid,
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

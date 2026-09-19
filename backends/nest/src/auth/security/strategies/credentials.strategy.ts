import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import {
    InternalServerErrorException,
    BaseException
} from '@/common/exceptions';
import {
    AuthEvents,
    UnknownServerErrorEvent
} from '@/events/auth.events';
import { SecurityService } from '@/auth/security/security.service';
import { createAuthContextFromRequest } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';

@Injectable()
export class CredentialsStrategy extends PassportStrategy(
    Strategy,
    'credentials'
) {
    constructor(
        private readonly securityService: SecurityService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super({
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        username: string,
        password: string
    ): Promise<AuthUser> {
        const context = createAuthContextFromRequest(request);

        try {
            return await this.securityService.verifyCredentials(
                username,
                password,
                context
            );
        } catch (exception: any) {
            if (exception instanceof BaseException) {
                throw exception;
            } else {
                await this.eventEmitter.emitAsync(
                    AuthEvents.UNKNOWN_SERVER_ERROR,
                    new UnknownServerErrorEvent(
                        username,
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
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import {
    InternalServerErrorException,
    InvalidCredentialsException,
    ResourceNotFoundException,
    BaseException
} from '@/common/exceptions';
import {
    AuthEvents,
    UserNotFoundEvent,
    UnknownServerErrorEvent
} from '@/events/auth.events';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/database/entities/user.entity';
import { createAuthContextFromRequest } from '@/auth/auth-context.decorator';

@Injectable()
export class CredentialsStrategy extends PassportStrategy(
    Strategy,
    'credentials'
) {
    constructor(
        private readonly authService: AuthService,
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
    ): Promise<User> {
        const context = createAuthContextFromRequest(request);

        try {
            return await this.authService.authenticateCredentials(
                username,
                password,
                context
            );
        } catch (exception: any) {
            if (exception instanceof BaseException) {
                if (exception instanceof ResourceNotFoundException) {
                    await this.eventEmitter.emitAsync(
                        AuthEvents.USER_NOT_FOUND,
                        new UserNotFoundEvent(
                            username,
                            context.ipAddress
                        )
                    );

                    throw new InvalidCredentialsException(
                        'Invalid username or password'
                    )
                }

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
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
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
        try {
            return await this.authService.getUserFromCredentials(
                username,
                password,
                request
            );
        } catch (exception: any) {
            if (exception instanceof BaseException) {
                if (exception instanceof ResourceNotFoundException) {
                    await this.eventEmitter.emitAsync(
                        AuthEvents.USER_NOT_FOUND,
                        new UserNotFoundEvent(
                            username,
                            request.ip ?? ''
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
                        request.ip ?? '',
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
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TokensMixin } from './tokens.mixin';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    SessionNotFoundException
} from '@/common/exceptions';
import { AccessTokenPayload } from '@/auth/dtos/tokens.dto';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { Session } from '@/database/entities/session.entity';

@Injectable()
export class JwtLogoutStrategy extends TokensMixin(
    PassportStrategy(
        Strategy,
        'jwt-logout'
    )
) {
    constructor(
        private readonly sessionsService: SessionsService
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                JwtLogoutStrategy.extractToken(request, 'access_token'),
            secretOrKey: JwtLogoutStrategy.getSecret(
                'JWT_ACCESS_SECRET'
            )
        });
    }

    async validate(payload: AccessTokenPayload): Promise<Session> {
        try {
            return await this.sessionsService.findById(
                payload.sid
            );
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                throw new SessionNotFoundException(
                    'Invalid token'
                )
            } else {
                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error'
                );
            }
        }
    }
}
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    SessionNotFoundException
} from '@/common/exceptions';
import { AccessTokenPayload } from '@/auth/dtos/tokens.dto';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { Session } from '@/database/entities/session.entity';

@Injectable()
export class JwtLogoutStrategy extends PassportStrategy(
    Strategy,
    'jwt-logout'
) {
    constructor(
        private readonly sessionsService: SessionsService
    ) {
        const secret = process.env.JWT_ACCESS_SECRET ?? '';

        if (!secret) {
            throw new InternalServerErrorException(
                'JWT_ACCESS_SECRET is not set'
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (request: Request) => request.cookies?.access_token
            ]),
            secretOrKey: secret
        });
    }

    async validate(payload: AccessTokenPayload): Promise<Session> {
        try {
            return this.sessionsService.findById(
                payload.sid
            );
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                throw new SessionNotFoundException(
                    'Invalid Token'
                )
            } else {
                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error'
                );
            }
        }
    }
}
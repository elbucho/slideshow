import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
        private readonly sessionsService: SessionsService,
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                ExtractJwt.fromAuthHeaderAsBearerToken()(request),
            secretOrKey: configService.get('jwt.access.secret') as string
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
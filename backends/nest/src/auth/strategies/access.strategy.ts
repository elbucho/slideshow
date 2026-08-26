import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AccessTokenPayload } from '@/tokens/dtos/tokens.dto';
import { AuthUser } from '@/auth/auth-user.decorator';

@Injectable()
export class AccessStrategy extends PassportStrategy(
    Strategy,
    'access'
) {
    constructor(
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                ExtractJwt.fromAuthHeaderAsBearerToken()(request),
            secretOrKey: configService.get('jwt.access.secret') as string
        });
    }

    async validate(payload: AccessTokenPayload): Promise<AuthUser> {
        return {
            userId: payload.sub,
            sessionId: payload.sid
        }
    }
}
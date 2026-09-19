import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokensMixin } from './tokens.mixin';
import { AccessTokenPayload } from '@/tokens/dtos/tokens.dto';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';

@Injectable()
export class AccessStrategy extends TokensMixin(
    PassportStrategy(
        Strategy,
        'access'
    )
) {
    constructor(
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: AccessStrategy.extractToken,
            secretOrKey: configService.get(
                'jwt.access.secret'
            ) as string
        });
    }

    async validate(
        payload: AccessTokenPayload
    ): Promise<AuthUser> {
        return {
            userId: payload.sub,
            sessionId: payload.sid
        }
    }
}
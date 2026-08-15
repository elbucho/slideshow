import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TokensMixin } from './tokens.mixin';
import { AuthService } from '@/auth/auth.service';
import { InvalidCredentialsException } from '@/common/exceptions';
import { RefreshTokenPayload } from '@/auth/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';

@Injectable()
export class JwtRefreshStrategy extends TokensMixin(
    PassportStrategy(
        Strategy,
        'jwt-refresh'
    )
) {
    constructor(
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                JwtRefreshStrategy.extractToken(request, 'refresh_token'),
            secretOrKey: JwtRefreshStrategy.getSecret(
                'JWT_REFRESH_SECRET'
            ),
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        payload: RefreshTokenPayload
    ): Promise<User> {
        // The token string isn't passed into validate() by Strategy
        // instead, it just decodes the token and passes in the payload.
        // The problem is that part of our verification involves us storing
        // a hashed version of the token in the sessions table of the
        // database, so we need to verify that it matches the provided
        // token.  This means we must call extractRefreshToken again
        // to get the actual token string.
        const token =
            JwtRefreshStrategy.extractToken(request, 'refresh_token');

        if (!token) {
            throw new InvalidCredentialsException(
                'Invalid token'
            )
        }

        return await this.authService.verifyToken(
            token,
            payload.sub
        );
    }
}

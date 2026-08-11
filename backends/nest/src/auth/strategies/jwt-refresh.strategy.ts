import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import {
    InternalServerErrorException,
    InvalidCredentialsException
} from '@/common/types';
import { RefreshTokenPayload } from '@/auth/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh'
) {
    private static extractRefreshToken(
        request: Request
    ): string|null {
        return (
            ExtractJwt.fromAuthHeaderAsBearerToken()(request) ??
            request.cookies?.refresh_token ??
            null
        );
    };

    constructor(
        private readonly authService: AuthService,
    ) {
        const secret = process.env.JWT_REFRESH_SECRET ?? '';

        if (!secret) {
            throw new InternalServerErrorException(
                'JWT_REFRESH_SECRET is not set'
            );
        }

        super({
            jwtFromRequest: JwtRefreshStrategy.extractRefreshToken,
            secretOrKey: secret,
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        payload: RefreshTokenPayload
    ): Promise<User> {
        const token =
            JwtRefreshStrategy.extractRefreshToken(request);

        if (!token) {
            throw new InvalidCredentialsException(
                'Invalid token'
            )
        }

        return await this.authService.verifyToken(
            token,
            payload.sub,
            request
        );
    }
}

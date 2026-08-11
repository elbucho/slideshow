import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '@/users/users.service';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    AuthenticationRequiredException
} from '@/common/exceptions';
import { AccessTokenPayload } from '@/auth/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(
    Strategy,
    'jwt'
) {
    constructor(
        private readonly userService: UsersService
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

    async validate(payload: AccessTokenPayload): Promise<User> {
        try {
            return this.userService.findById(
                payload.sub
            );
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                throw new AuthenticationRequiredException(
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
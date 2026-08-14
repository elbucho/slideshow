import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TokensMixin } from './tokens.mixin';
import { UsersService } from '@/users/users.service';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    AuthenticationRequiredException
} from '@/common/exceptions';
import { AccessTokenPayload } from '@/auth/dtos/tokens.dto';
import { User } from '@/database/entities/user.entity';

@Injectable()
export class JwtStrategy extends TokensMixin(
    PassportStrategy(
        Strategy,
        'jwt'
    )
) {
    constructor(
        private readonly userService: UsersService
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                JwtStrategy.extractToken(request, 'access_token'),
            secretOrKey: JwtStrategy.getSecret('JWT_ACCESS_SECRET')
        });
    }

    async validate(payload: AccessTokenPayload): Promise<User> {
        try {
            return await this.userService.findById(
                payload.sub
            );
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                throw new AuthenticationRequiredException(
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
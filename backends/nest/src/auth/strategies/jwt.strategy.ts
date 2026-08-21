import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
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
        private readonly userService: UsersService,
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: (request: Request) =>
                ExtractJwt.fromAuthHeaderAsBearerToken()(request),
            secretOrKey: configService.get('jwt.access.secret') as string
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
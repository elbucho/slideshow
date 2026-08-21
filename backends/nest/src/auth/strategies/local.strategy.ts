import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import type { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/database/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(
    Strategy,
    'local'
) {
    constructor(
        private readonly authService: AuthService
    ) {
        super({
            passReqToCallback: true
        });
    }

    async validate(
        request: Request,
        username: string,
        password: string
    ): Promise<User> {
        return this.authService.verifyUser(
            username,
            password,
            request
        );
    }
}
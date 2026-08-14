import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokensMixin } from './tokens.mixin';

@Injectable()
export class JwtLogoutGuard extends TokensMixin(
    AuthGuard('jwt-logout')
) { }
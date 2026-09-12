import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokensMixin } from './tokens.mixin';

@Injectable()
export class RefreshGuard extends TokensMixin(
    AuthGuard('refresh')
) { }
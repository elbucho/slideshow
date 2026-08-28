import {
    CanActivate,
    ExecutionContext,
    Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { TokensMixin } from './tokens.mixin';
import { SKIP_DEFAULT_GUARD } from
        '@/auth/decorators/skip-default-guard.decorator';

@Injectable()
export class AccessGuard extends TokensMixin(
    AuthGuard('access')
) implements CanActivate {
    constructor(
        private reflector: Reflector
    ) {
        super();
    }

    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> {
        const skip = this.reflector
            .getAllAndOverride<boolean>(SKIP_DEFAULT_GUARD, [
                context.getHandler(),
                context.getClass()
            ]);

        if (skip) return true;

        return this.validateAccess(context);
    }

    // Real Passport validation, bypassing the skip check.
    // Call this directly from other guards (eg. SessionsGuard)
    // that need AccessGuard's logic without the
    // metadata check.
    validateAccess(
        context: ExecutionContext
    ): boolean | Promise<boolean> {
        return super.canActivate(context) as
            boolean | Promise<boolean>;
    }
}
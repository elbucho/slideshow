import {
    Injectable,
    CanActivate,
    ExecutionContext
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ValidationErrorException } from '@/common/exceptions';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const fieldsMissing: string[] = [];

        if (!request.body?.email) {
            fieldsMissing.push('email');
        }

        if (!request.body?.password) {
            fieldsMissing.push('password');
        }

        if (fieldsMissing.length > 0) {
            throw new ValidationErrorException(
                'The request body contains an invalid schema',
                {
                    missing_fields: fieldsMissing
                }
            );
        }

        return super.canActivate(context) as Promise<boolean>;
    }
}
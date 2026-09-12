import {
    Injectable,
    CanActivate,
    ExecutionContext
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ValidationErrorException } from '@/common/exceptions';
import { UserLoginDto } from '@/auth/dtos/user-login.dto';

@Injectable()
export class CredentialsGuard extends AuthGuard('credentials') implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const fieldsMissing: string[] = [];
        const dto = new UserLoginDto();

        for (const key of Object.keys(dto)) {
            if (!request.body || !request.body[key]) {
                fieldsMissing.push(key);
            }
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
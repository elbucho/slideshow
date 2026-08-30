import {
    createParamDecorator,
    ExecutionContext
} from '@nestjs/common';
import { Request } from 'express';

export interface AuthContext {
    ipAddress: string;
    userAgent: string;
}

export function createAuthContextFromRequest(
    request: Request
): AuthContext {
    return {
        ipAddress: request.ip ?? '',
        userAgent: request.headers?.['user-agent'] ?? ''
    };
}

export function createAuthContext(
    executionContext: ExecutionContext
): AuthContext {
    const request = executionContext
        .switchToHttp()
        .getRequest();

    return createAuthContextFromRequest(request);
}

export const AuthContextDecorator =
    createParamDecorator(
        (
            _data: unknown,
            ctx: ExecutionContext
        ): AuthContext => {
            return createAuthContext(ctx);
        }
    );
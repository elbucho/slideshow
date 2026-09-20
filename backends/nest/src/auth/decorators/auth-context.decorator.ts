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
    let ipAddress = request.headers?.['x-forwarded-for'] ??
        request.ip ??
        '';

    if (Array.isArray(ipAddress)) {
       ipAddress = ipAddress[0];
    }

    return {
        ipAddress,
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

export function authContextParamFactory(
    _data: unknown,
    ctx: ExecutionContext
): AuthContext {
    return createAuthContext(ctx);
}
export const AuthContextDecorator =
    createParamDecorator(
        authContextParamFactory
    );
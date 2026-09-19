import {
    createParamDecorator,
    ExecutionContext
} from '@nestjs/common';
import { InternalServerErrorException } from '@/common/exceptions';

export interface AuthUser {
    userId: number;
    sessionId?: number;
}

export function getAuthUser(
    context: ExecutionContext
): AuthUser {
    const request = context
        .switchToHttp()
        .getRequest();

    if (request.user?.userId) {
        return {
            userId: request.user.userId,
            sessionId: request.user.sessionId ?? undefined
        };
    }

    throw new InternalServerErrorException(
        'Missing or invalid user in request'
    );
}

export function authUserParamFactory(
    _data: unknown,
    context: ExecutionContext
): AuthUser {
    return getAuthUser(context);
}

export const AuthUserDecorator =
    createParamDecorator(
        authUserParamFactory
    );
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

    if (
        request.user?.userId &&
        request.user?.sessionId
    ) {
        return request.user;
    }

    throw new InternalServerErrorException(
        'Missing or invalid user in request'
    );
}

export const AuthUserDecorator =
    createParamDecorator(
        (_data: unknown, context: ExecutionContext) =>
            getAuthUser(context)
    );
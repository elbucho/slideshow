import {
    createParamDecorator,
    ExecutionContext
} from '@nestjs/common';
import { User } from '@/database/entities/user.entity';
import { InternalServerErrorException } from '@/common/exceptions';

export interface AuthUser {
    userId: number;
    sessionId: number;
}

export function getAuthUser(
    context: ExecutionContext
): User | AuthUser {
    const request = context
        .switchToHttp()
        .getRequest();

    if (request.user) {
        if (request.user instanceof User) {
            return request.user;
        }

        if (
            request.user.userId &&
            request.user.sessionId
        ) {
            return request.user;
        }
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
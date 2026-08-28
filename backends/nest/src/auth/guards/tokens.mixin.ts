import { ExecutionContext, Type } from '@nestjs/common';
import { JsonWebTokenError } from '@nestjs/jwt';
import {
    BaseException,
    InternalServerErrorException,
    InvalidCredentialsException
} from '@/common/exceptions';

export function TokensMixin<TBase extends Type<any>>(
    Base: TBase
) {
    return class extends Base {
        handleRequest<TUser = any>(
            err: any,
            user: TUser,
            info: any,
            _context: ExecutionContext,
            _status?: any
        ): TUser {
            if (
                !user ||
                info instanceof JsonWebTokenError
            ) {
                throw new InvalidCredentialsException(
                    'Invalid token'
                );
            }

            if (err) {
                if (err instanceof BaseException) {
                    throw err;
                }

                throw new InternalServerErrorException(
                    err.message ?? 'Internal server error',
                    {
                        error: err
                    }
                );
            }

            return user;
        }
    }
}
import { ExecutionContext, Type } from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError} from '@nestjs/jwt';
import {
    BaseException,
    InternalServerErrorException,
    InvalidCredentialsException, SessionExpiredException
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

            if (
                !user ||
                info instanceof JsonWebTokenError
            ) {
                if (info instanceof TokenExpiredError) {
                    throw new SessionExpiredException(
                        'Token expired',
                        {
                            tokenExpiredAt: info.expiredAt
                        }
                    );
                }

                throw new InvalidCredentialsException(
                    'Invalid token'
                );
            }

            return user;
        }
    }
}
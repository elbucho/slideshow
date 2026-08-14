import { ExecutionContext, Type } from '@nestjs/common';
import {
    InternalServerErrorException,
    SessionNotFoundException
} from '@/common/exceptions';

export function TokensMixin<TBase extends Type<any>>(
    Base: TBase
) {
    return class extends Base {
        handleRequest<TUser = any>(
            err: any,
            user: TUser,
            _info: any,
            _context: ExecutionContext,
            _status?: any
        ): TUser {
            if (err) {
                throw new InternalServerErrorException(
                    err.message ?? 'Internal server error',
                    {
                        error: err
                    }
                );
            }

            if (!user) {
                throw new SessionNotFoundException(
                    'Invalid token'
                );
            }

            return user;
        }
    }
}
import {
    ExecutionContext,
    Injectable
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    InternalServerErrorException,
    SessionNotFoundException
} from '@/common/types';

@Injectable()
export class JwtLogoutGuard extends AuthGuard('jwt-logout') {
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
                err
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
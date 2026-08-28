import {
    CanActivate,
    ExecutionContext,
    Injectable
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessGuard } from '@/auth/guards/access.guard';
import { StateGuard } from '@/auth/guards/state.guard';

@Injectable()
export class SessionsGuard implements CanActivate {
    constructor(
        private accessGuard: AccessGuard,
        private stateGuard: StateGuard,
        private jwtService: JwtService
    ) {}

    canActivate(context: ExecutionContext) {
        const request = context
            .switchToHttp()
            .getRequest();

        const token = this.extractToken(request);
        const useState = this.isTempToken(token);

        return useState
            ? this.stateGuard.validateAccess(context)
            : this.accessGuard.validateAccess(context);
    }

    private extractToken(
        request: any
    ): string | undefined {
        const authHeader =
            request.headers['authorization'];

        if (!authHeader) return undefined;

        const [scheme, token] = authHeader.split(' ');
        return scheme?.toLowerCase() === 'bearer'
            ? token
            : undefined;
    }

    private isTempToken(
        token: string | undefined
    ): boolean {
        if (!token) return false;

        const payload = this.jwtService.decode(token);

        return (
            typeof payload === 'object' &&
            payload !== null &&
            (payload as any).type === 'temp'
        );
    }
}
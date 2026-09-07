import { Session } from '@/database/entities/session.entity';
import { AuthTokens } from '@/tokens/dtos/tokens.dto';

export interface AuthenticatedResponse {
    code: 'AUTHENTICATED';
    payload: AuthTokens;
}

export interface SessionLimitResponse {
    code: 'SESSION_LIMIT_REACHED';
    payload: {
        temporary_token: string;
        sessions: Session[];
    }
}

export type LoginResponseUnion = AuthenticatedResponse | SessionLimitResponse;
interface TokenPayload {
    sub: number;
    sid: number;
}

export interface AccessTokenPayload extends TokenPayload {
    type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
    type: 'refresh';
    jti: string;
}

export interface TempTokenPayload extends TokenPayload {
    type: 'common';
    jti: string;
}

export interface MFATokenPayload extends TokenPayload {
    type: 'mfa';
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}

export interface TempToken {
    temporary_token: string;
}

export type TokenUnion = AuthTokens | TempToken;
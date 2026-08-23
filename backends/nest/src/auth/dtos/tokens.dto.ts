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

export interface MFATokenPayload extends TokenPayload {
    type: 'mfa';
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}
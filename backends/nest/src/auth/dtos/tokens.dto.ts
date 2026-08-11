export interface AccessTokenPayload {
    sub: number;
    sid: number;
    type: 'access';
}

export interface RefreshTokenPayload {
    sub: number;
    sid: number;
    jti: string;
    type: 'refresh';
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}
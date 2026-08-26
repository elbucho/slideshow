export enum AuthEvents {
    LOGGED_IN = 'auth.user.logged-in',
    LOGGED_OUT = 'auth.user.logged-out',
    INVALID_PASSWORD = 'auth.user.invalid-password',
    LOCKED_USER_LOGIN_ATTEMPT = 'auth.user.locked-user-login-attempt',
    USER_NOT_FOUND = 'auth.user.username-not-found',
    USER_ACCOUNT_LOCKED = 'auth.user.account-locked',
    UNKNOWN_SERVER_ERROR = 'auth.user.unknown-server-error',
    SESSION_NOT_FOUND = 'auth.session.not-found',
    SESSION_TOKEN_EXPIRED = 'auth.session.token-expired',
    SESSION_LIMIT_EXCEEDED = 'auth.session.limit-exceeded',
    TOKEN_SESSION_MISMATCH = 'auth.session.token-mismatch',
    STATE_NOT_FOUND = 'auth.state.not-found',
    TOKEN_STATE_MISMATCH = 'auth.state.token-mismatch',
    TEMP_TOKEN_GRANTED = 'auth.state.token-granted'
}

export class UserLoggedInEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}
}

export class UserLoggedOutEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number
    ) {}
}

export class UserLoginFailedEvent {
    constructor(
        public readonly userId: number,
        public readonly email: string,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}
}

export class LockedUserLoginAttemptEvent {
    constructor(
        public readonly userId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}
}

export class UserAccountLockedEvent {
    constructor(
        public readonly userId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string,
        public readonly lockedBy: number|'AUTO',
        public readonly lockedReason: string
    ) {}
}

export class UserNotFoundEvent {
    constructor(
        public readonly identifier: string,
        public readonly ipAddress: string
    ) {}
}

export class UnknownServerErrorEvent {
    constructor(
        public readonly identifier: string,
        public readonly ipAddress: string,
        public readonly exception: unknown
    ) {}
}

export class SessionNotFoundEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}
}

export class SessionIpMismatchEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number,
        public readonly userAgent: string,
        public readonly expectedIpAddress: string,
        public readonly actualIpAddress: string
    ) {}
}

export class SessionUserAgentMismatchEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number,
        public readonly ipAddress: string,
        public readonly expectedUserAgent: string,
        public readonly actualUserAgent: string
    ) {}
}

export class SessionTokenExpiredEvent {
    constructor (
        public readonly type: string,
        public readonly sessionId: number,
        public readonly userId: number,
        public readonly expiredAt: Date,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}
}

export class SessionRevokedEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string,
        public readonly revokeReason: string,
        public readonly revokedBy: number|'AUTO'
    ) {}
}

export class SessionLimitExceededEvent {
    constructor(
        public readonly userId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string,
        public readonly currentSessions: number,
        public readonly maxSessions: number
    ) {}
}

export class TokenMismatchEvent {
    constructor(
        public readonly resourceId: number,
        public readonly userId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string,
    ) {}
}

export class StateNotFoundEvent {
    constructor(
        public readonly userId: number,
        public readonly userStateId: number,
        public readonly ipAddress: string
    ) {}
}

export class TempTokenGrantedEvent {
    constructor(
        public readonly userId: number,
        public readonly userStateId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}
}
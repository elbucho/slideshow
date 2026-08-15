export class UserLoggedInEvent {
    constructor(
        public readonly userId: number,
        public readonly sessionId: number,
        public readonly ipAddress: string,
        public readonly userAgent: string
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

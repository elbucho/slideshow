export enum AuditEvents {
    LOGGED_IN = 'auth.user.logged-in',
    LOGGED_OUT = 'auth.user.logged-out',
    LOGIN_FAILED = 'auth.user.login-failed',
    LOCKED_USER_LOGIN_ATTEMPT = 'auth.user.locked-user-login-attempt',
    USER_ACCOUNT_LOCKED = 'auth.user.user-account-locked',
    USER_AGENT_MISMATCH = 'auth.session.user-agent-mismatch',
    IP_ADDR_MISMATCH = 'auth.session.ip-address-mismatch',
    SESSION_REVOKED = 'auth.session.session-revoked'
}
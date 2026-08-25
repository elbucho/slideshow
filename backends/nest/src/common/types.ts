export interface APIResponse<T> {
    type: 'error' | 'success';
    code: ErrorCode | SuccessCode;
    details: T
}

export interface AuthContext {
    userId: number;
    sessionId: number;
}

export type SuccessCode =
    | 'RESOURCE_FETCHED'
    | 'RESOURCES_FETCHED'
    | 'RESOURCE_CREATED'
    | 'RESOURCES_CREATED'
    | 'RESOURCE_UPDATED'
    | 'RESOURCE_DELETED'
    | 'RESOURCES_DELETED'
    | 'MFA_REQUIRED'
    | 'MFA_CHALLENGE_SENT'
    | 'AUTHENTICATED'
    | 'TOKENS_REFRESHED'
    | 'LOGGED_OUT';

export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'AUTHENTICATION_REQUIRED'
    | 'MFA_RATE_EXCEEDED'
    | 'INVALID_CREDENTIALS'
    | 'SESSION_EXPIRED'
    | 'SESSION_NOT_FOUND'
    | 'SESSION_LIMIT_EXCEEDED'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'RESOURCE_NOT_FOUND'
    | 'RESOURCE_ALREADY_EXISTS'
    | 'INVALID_OPERATION'
    | 'PAYLOAD_TOO_LARGE'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'INVALID_IMAGE'
    | 'INTERNAL_SERVER_ERROR';

export type StateName =
    | 'ACCOUNT_LOCKED'
    | 'PENDING_ACTIVATION'
    | 'SESSION_LIMIT_EXCEEDED'

export type TokenType =
    | 'access_token'
    | 'refresh_token'
    | 'mfa_token';

export type ResourceType =
    | 'user'
    | 'session'
    | 'photo'
    | 'photo_avatar'
    | 'state'
    | 'user_state'
    | 'tag'
    | 'person'
    | 'slideshow'
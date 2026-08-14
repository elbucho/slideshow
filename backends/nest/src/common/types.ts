export interface MessageResponse<T> {
    message: string;
    data: T;
}

export interface ErrorDetails {
    [key: string]: unknown;
}

export interface ErrorResponse {
    error: {
        code: ErrorCode;
        message: string;
        details: ErrorDetails;
    }
}

export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'AUTHENTICATION_REQUIRED'
    | 'INVALID_CREDENTIALS'
    | 'SESSION_EXPIRED'
    | 'SESSION_NOT_FOUND'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'RESOURCE_NOT_FOUND'
    | 'RESOURCE_ALREADY_EXISTS'
    | 'INVALID_OPERATION'
    | 'PAYLOAD_TOO_LARGE'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'INVALID_IMAGE'
    | 'INTERNAL_SERVER_ERROR';

export type TokenType =
    | 'access_token'
    | 'refresh_token';
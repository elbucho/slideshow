import { HttpException } from '@nestjs/common';
import { ErrorCode, ErrorDetails } from './types';
import type { Request } from "express";

export class BaseException extends HttpException {
    constructor (
        code: ErrorCode,
        status: number,
        message: string,
        details?: ErrorDetails
    ) {
        super(message, status);

        this.code = code;
        this.details = details;
    }

    readonly code: ErrorCode;
    readonly details?: ErrorDetails;
}

export class ValidationErrorException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'VALIDATION_ERROR',
            400,
            message,
            details
        )
    }
}

export class AuthenticationRequiredException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'AUTHENTICATION_REQUIRED',
            401,
            message,
            details
        )
    }
}

export class InvalidCredentialsException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'INVALID_CREDENTIALS',
            401,
            message,
            details
        )
    }
}

export class SessionExpiredException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'SESSION_EXPIRED',
            401,
            message,
            details
        )
    }
}

export class SessionNotFoundException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'SESSION_NOT_FOUND',
            401,
            message,
            details
        )
    }
}

export class InsufficientPermissionsException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'INSUFFICIENT_PERMISSIONS',
            403,
            message,
            details
        )
    }
}

export class ResourceNotFoundException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'RESOURCE_NOT_FOUND',
            404,
            message,
            details
        )
    }
}

export class ResourceAlreadyExistsException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'RESOURCE_ALREADY_EXISTS',
            409,
            message,
            details
        )
    }
}

export class InvalidOperationException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'INVALID_OPERATION',
            405,
            message,
            details
        )
    }
}

export class MethodNotAllowedException extends InvalidOperationException {
    constructor(request: Request) {
        super(
            'Method not allowed',
            {
                method: request.method,
                path: request.url
            }
        );
    }
}

export class PayloadTooLargeException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'PAYLOAD_TOO_LARGE',
            413,
            message,
            details
        )
    }
}

export class UnsupportedMediaTypeException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'UNSUPPORTED_MEDIA_TYPE',
            415,
            message,
            details
        )
    }
}

export class InvalidImageException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'INVALID_IMAGE',
            400,
            message,
            details
        )
    }
}

export class InternalServerErrorException extends BaseException {
    constructor (
        message: string,
        details?: ErrorDetails
    ) {
        super(
            'INTERNAL_SERVER_ERROR',
            500,
            message,
            details
        )
    }
}
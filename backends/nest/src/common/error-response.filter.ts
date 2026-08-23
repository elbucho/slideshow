import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    NotFoundException
} from '@nestjs/common';
import { APIResponse } from './types';
import { BaseException } from './exceptions';
import { Response } from 'express';

@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
    catch(exception: Error, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();

        let status: number = 500;
        let errorResponse: APIResponse<Record<string, any>> = {
            type: 'error',
            code: 'INTERNAL_SERVER_ERROR',
            details: { stack: exception.stack }
        };

        if (exception instanceof BaseException) {
            status = exception.getStatus();
            let details = exception.details ?? {};
            details['message'] = exception.message;

            errorResponse = {
                type: 'error',
                code: exception.code,
                details: details
            };
        }

        if (exception instanceof NotFoundException) {
            status = exception.getStatus();

            errorResponse = {
                type: 'error',
                code: "RESOURCE_NOT_FOUND",
                details: {
                    message: exception.message
                }
            }
        }

        return response
            .status(status)
            .json(errorResponse);
    }
}
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter, NotFoundException
} from '@nestjs/common';
import {
    ErrorResponse,
    BaseException
} from '@/common/types';
import { Response } from 'express';

@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
    catch(exception: Error, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();

        let status: number = 500;
        let errorResponse: ErrorResponse = {
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error',
                details: { stack: exception.stack }
            }
        };

        if (exception instanceof BaseException) {
            status = exception.getStatus();

            errorResponse = {
                error: {
                    code: exception.code,
                    message: exception.message,
                    details: exception.details ?? {}
                }
            };
        }

        if (exception instanceof NotFoundException) {
            status = exception.getStatus();

            errorResponse = {
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: exception.message,
                    details: {}
                }
            }
        }

        return response
            .status(status)
            .json(errorResponse);
    }
}
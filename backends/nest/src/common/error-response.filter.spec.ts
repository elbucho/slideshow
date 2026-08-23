import {
    ArgumentsHost,
    NotFoundException
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseFilter } from './error-response.filter';
import { ValidationErrorException } from './exceptions';

describe('ErrorResponseFilter', () => {
    let filter: ErrorResponseFilter;
    let response: jest.Mocked<Response>;
    let host: jest.Mocked<ArgumentsHost>;

    beforeEach(() => {
        response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        } as any as jest.Mocked<Response>;

        host = {
            switchToHttp: jest.fn().mockReturnValue({
                getResponse: jest.fn().mockReturnValue(response)
            })
        } as any as jest.Mocked<ArgumentsHost>;

        filter = new ErrorResponseFilter();
    });

    it('should return a 500 response for an unknown exception', () => {
        const exception = new Error('Something went wrong');

        filter.catch(exception, host);

        expect(response.status)
            .toHaveBeenCalledWith(500);

        expect(response.json)
            .toHaveBeenCalledWith({
                type: 'error',
                code: 'INTERNAL_SERVER_ERROR',
                details: {
                    stack: exception.stack
                }
            });
    });

    it(
        'should return a structured error if an exception ' +
        'that extends BaseException is thrown',
        () => {
            const exception = new ValidationErrorException(
                'test_message',
                {
                    foo: 'bar'
                }
            );

            filter.catch(exception, host);

            expect(response.status)
                .toHaveBeenCalledWith(400);

            expect(response.json)
                .toHaveBeenCalledWith({
                    type: 'error',
                    code: 'VALIDATION_ERROR',
                    details: {
                        foo: 'bar',
                        message: 'test_message'
                    }
                });
        }
    );

    it(
        'should return a RESOURCE_NOT_FOUND message if a ' +
        'NotFoundException is thrown',
        () => {
            const exception = new NotFoundException(
                'test-message',
                ''
            );

            filter.catch(exception, host);

            expect(response.status)
                .toHaveBeenCalledWith(404);

            expect(response.json)
                .toHaveBeenCalledWith({
                    type: 'error',
                    code: 'RESOURCE_NOT_FOUND',
                    details: {
                        message: 'test-message'
                    }
                });
        }
    );
});
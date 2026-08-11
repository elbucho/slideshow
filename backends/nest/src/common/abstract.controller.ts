import { All, Req } from '@nestjs/common';
import type { Request } from 'express';
import { InvalidOperationException } from '@/common/types';
import type { MessageResponse } from '@/common/types';

type MethodResponses = Partial<{
    GET: unknown;
    POST: unknown;
    PUT: unknown;
    PATCH: unknown;
    DELETE: unknown;
}>;

type ResponseFor<
    TResponses,
    TMethod extends keyof TResponses
> = TResponses[TMethod];

class MethodNotAllowedException extends InvalidOperationException {
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

export abstract class AbstractController<
    TResponses extends MethodResponses
> {
    protected message: string = '';

    protected get(
        request: Request
    ): ResponseFor<TResponses, 'GET'> {
        throw new MethodNotAllowedException(request);
    }

    protected post(
        request: Request
    ): ResponseFor<TResponses, 'POST'> {
        throw new MethodNotAllowedException(request);
    }

    protected put(
        request: Request
    ): ResponseFor<TResponses, 'PUT'> {
        throw new MethodNotAllowedException(request);
    }

    protected patch(
        request: Request
    ): ResponseFor<TResponses, 'PATCH'> {
        throw new MethodNotAllowedException(request);
    }

    protected delete(
        request: Request
    ): ResponseFor<TResponses, 'DELETE'> {
        throw new MethodNotAllowedException(request);
    }

    @All()
    protected match(
        @Req() request: Request
    ): MessageResponse<ResponseFor<TResponses, keyof TResponses>> {
        let result: ResponseFor<TResponses, keyof TResponses>

        switch (request.method) {
            case 'GET':
                result = this.get(request);
                break;

            case 'POST':
                result = this.post(request);
                break;

            case 'PUT':
                result = this.put(request);
                break;

            case 'PATCH':
                result = this.patch(request);
                break;

            case 'DELETE':
                result = this.delete(request);
                break;

            default:
                throw new MethodNotAllowedException(
                    request
                );
        }

        return {
            message: this.message,
            data: result
        }
    }
}

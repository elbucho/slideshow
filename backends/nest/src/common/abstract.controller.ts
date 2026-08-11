import { All, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
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

    protected async get(
        request: Request,
        response?: Response
    ): Promise<ResponseFor<TResponses, 'GET'>> {
        throw new MethodNotAllowedException(request);
    }

    protected async post(
        request: Request,
        response?: Response
    ): Promise<ResponseFor<TResponses, 'POST'>> {
        throw new MethodNotAllowedException(request);
    }

    protected async put(
        request: Request,
        response?: Response
    ): Promise<ResponseFor<TResponses, 'PUT'>> {
        throw new MethodNotAllowedException(request);
    }

    protected async patch(
        request: Request,
        response?: Response
    ): Promise<ResponseFor<TResponses, 'PATCH'>> {
        throw new MethodNotAllowedException(request);
    }

    protected async delete(
        request: Request,
        response?: Response
    ): Promise<ResponseFor<TResponses, 'DELETE'>> {
        throw new MethodNotAllowedException(request);
    }

    @All()
    protected async match(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<MessageResponse<ResponseFor<TResponses, keyof TResponses>>> {
        let result: ResponseFor<TResponses, keyof TResponses>

        switch (request.method) {
            case 'GET':
                result = await this.get(request, response);
                break;

            case 'POST':
                result = await this.post(request, response);
                break;

            case 'PUT':
                result = await this.put(request, response);
                break;

            case 'PATCH':
                result = await this.patch(request, response);
                break;

            case 'DELETE':
                result = await this.delete(request, response);
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

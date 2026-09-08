import { OpenAPIMockValidator } from
        'openapi-mock-validator';
import type { Response } from 'supertest';

export interface ApiSpecMatcherContext {
    validator: OpenAPIMockValidator;
}

export function createToSatisfyApiSpec(
    context: ApiSpecMatcherContext
) {
    return function toSatisfyApiSpec(
        this: jest.MatcherContext,
        received: Response,
        path: string,
        method: string
    ){
        if (
            !received ||
            typeof received.status !== 'number'
        ) {
            throw new TypeError(
                'toSatisfyApiSpec() expects a ' +
                'Supertest response object'
            );
        }

        const normalizedMethod =
            method.toUpperCase();

        const match =
            context.validator.matchPath(
            path,
            normalizedMethod
        );

        if (!match) {
            return {
                pass: false,
                message: () =>
                    `expected ${normalizedMethod} ${path} ` +
                    `to match an OpenAPI path`
            };
        }

        const result =
            context.validator.validateResponse(
                match.path,
                normalizedMethod,
                received.status,
                received.body
            );

        if (result.valid) {
            return {
                pass: true,
                message: () =>
                    `expected ${normalizedMethod} ${path} ` +
                    `not to satisfy the OpenAPI specification`
            };
        }

        const errors = result.errors
            .map(
                error =>
                    JSON.stringify(error, null, 2)
            ).join('\n');

        return {
            pass: false,
            message: () =>
                `expected ${normalizedMethod} ${path} ` +
                `to satisfy the OpenAPI specification.\n\n` +
                `Status: ${received.status}\n\n` +
                `Validation errors:\n${errors}`
        };
    };
}

export {};

declare global {
    namespace jest {
        interface Matchers<R, T = {}> {
            toSatisfyApiSpec(
                path: string,
                method: string
            ): R;
        }
    }
}
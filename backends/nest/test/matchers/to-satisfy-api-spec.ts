import { OpenAPIMockValidator, PathMatch, ValidationResult} from
        'openapi-mock-validator';
import type { Response as TestResponse } from 'supertest';

export interface ApiSpecMatcherContext {
    validator: OpenAPIMockValidator;
}

function satisfiesRequest(
    context: ApiSpecMatcherContext,
    received: Record<string, unknown>,
    match: PathMatch,
    method: string
): ValidationResult {
    return context.validator.validateRequest(
        match.path,
        method,
        received
    );
}

function satisfiesResponse(
    context: ApiSpecMatcherContext,
    received: TestResponse,
    match: PathMatch,
    method: string
): ValidationResult {
    if (
        !received.status ||
        typeof received.status !== 'number'
    ) {
        throw new TypeError(
            'toSatisfyApiSpec() expects a ' +
            'Supertest response object'
        );
    }

    return context.validator.validateResponse(
        match.path,
        method,
        received.status,
        received.body
    );
}

function isResponse(
    value: unknown
): value is TestResponse {
    return (
        typeof value === 'object' &&
            value !== null &&
            'status' in value &&
            'body' in value
    );
}

export function createToSatisfyApiSpec(
    context: ApiSpecMatcherContext
) {
    return function toSatisfyApiSpec(
        this: jest.MatcherContext,
        received: TestResponse | Record<string, unknown>,
        path: string,
        method: string
    ){
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

        const result = isResponse(received)
            ? satisfiesResponse(
                context,
                received as TestResponse,
                match,
                normalizedMethod
            )
            : satisfiesRequest(
                context,
                received as Record<string, unknown>,
                match,
                normalizedMethod
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
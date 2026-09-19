import { Request } from 'express';
import { TokensMixin } from './tokens.mixin';
import {AuthenticationRequiredException} from "@/common/exceptions";

describe('TokensMixin', () => {
    class BaseStrategy { }

    let strategy: InstanceType<ReturnType<typeof TokensMixin>>;

    beforeEach(() => {
        strategy = TokensMixin(BaseStrategy);
    });

    describe('extractToken', () => {
        it(
            'extracts the bearer token from the ' +
            'Authorization header',
            () => {
                const mockRequest = {
                    headers: { authorization: 'Bearer abc123' },
                } as Request;

                expect(
                    strategy.extractToken(
                        mockRequest
                    )
                ).toBe('abc123');
            }
        );

        it(
            'should throw an AuthenticationRequiredException ' +
            'when no token is present',
            () => {
                const mockRequest = {
                    path: '/foo/bar',
                    method: 'TEST',
                    headers: {}
                } as Request;

                expect(
                    () => strategy.extractToken(
                        mockRequest
                    )
                ).toThrow(
                    new AuthenticationRequiredException(
                        'A bearer token is required to access ' +
                        'this endpoint',
                        {
                            path: '/foo/bar',
                            method: 'TEST'
                        }
                    )
                );
            }
        );
    });
});
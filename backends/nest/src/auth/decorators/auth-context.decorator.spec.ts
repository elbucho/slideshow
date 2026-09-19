import { ExecutionContext } from '@nestjs/common';
import {
    AuthContext,
    createAuthContext,
    createAuthContextFromRequest,
    authContextParamFactory
} from '@/auth/decorators/auth-context.decorator';
import {Request} from "express";

describe('AuthContextDecorator functions', () => {
    const request = {
        ip: '127.0.0.1',
        headers: {
            'user-agent': 'test-agent'
        }
    } as any as Request;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    const getRequest = jest.fn()
        .mockReturnValue(request);

    const switchToHttp = jest.fn()
        .mockReturnValue({
            getRequest
        });

    const context = {
        switchToHttp
    } as any as ExecutionContext;

    describe('createAuthContext', () => {
        it(
            'should extract the request from ' +
            'the execution context and call ' +
            'createAuthContextFromRequest',
            () => {
                expect(createAuthContext(context))
                    .toStrictEqual(authContext);

                expect(switchToHttp)
                    .toHaveBeenCalled();

                expect(getRequest)
                    .toHaveBeenCalled();
            }
        );
    });

    describe('createAuthContextFromRequest', () => {
        it(
            'should take in a request, and return ' +
            'an AuthContext object',
            () => {
                expect(createAuthContextFromRequest(request))
                    .toStrictEqual(authContext);
            }
        );

        it(
            'should substitute in blank values for ' +
            'both the ip address and user agent if ' +
            'they are undefined in the request',
            () => {
                const mockRequest = {} as Request;

                expect(createAuthContextFromRequest(mockRequest))
                    .toEqual({
                        ipAddress: '',
                        userAgent: ''
                    });
            }
        );
    });

    describe('authContextParamFactory', () => {
        it(
            'builds an AuthContext from the execution ' +
            'context\'s request',
            () => {
                const result = authContextParamFactory(
                    undefined,
                    context
                );

                expect(result).toEqual(authContext);
            }
        );
    });
});
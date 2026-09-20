import { ExecutionContext } from '@nestjs/common';
import {
    AuthContext,
    createAuthContext,
    createAuthContextFromRequest,
    authContextParamFactory
} from '@/auth/decorators/auth-context.decorator';
import { Request } from 'express';

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
        let mockRequest: Request;

        beforeEach(() => {
            mockRequest = {
                ...request,
                headers: {
                    ...request.headers
                }
            } as Request;
        });

        it(
            'should take in a request, and return ' +
            'an AuthContext object',
            () => {
                expect(createAuthContextFromRequest(mockRequest))
                    .toStrictEqual(authContext);
            }
        );

        it(
            'should check the X-Forwarded-For header for ' +
            'IPs before checking request.ip',
            () => {
                mockRequest.headers['x-forwarded-for'] =
                    '10.20.30.40';

                expect(createAuthContextFromRequest(mockRequest))
                    .toEqual({
                        ...authContext,
                        ipAddress: '10.20.30.40'
                    });
            }
        );

        it(
            'should choose just the first IP if multiple ' +
            'IPs are present in the X-Forwarded-For header',
            () => {
                mockRequest.headers['x-forwarded-for'] =
                    [ '10.20.30.40', '20.30.40.50' ];

                expect(createAuthContextFromRequest(mockRequest))
                    .toEqual({
                        ...authContext,
                        ipAddress: '10.20.30.40'
                    });
            }
        );

        it(
            'should substitute in blank values for ' +
            'both the ip address and user agent if ' +
            'they are undefined in the request',
            () => {
                mockRequest = {} as Request;

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
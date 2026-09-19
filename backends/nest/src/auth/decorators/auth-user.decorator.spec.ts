import { ExecutionContext } from '@nestjs/common';
import {
    getAuthUser,
    AuthUser,
    authUserParamFactory
} from '@/auth/decorators/auth-user.decorator';
import { InternalServerErrorException } from
        '@/common/exceptions';

describe('AuthUserDecorator functions', () => {
    const authUser = {
        userId: 1,
        sessionId: 123
    } as any as AuthUser;

    let request = {
        user: null
    } as any;

    let context: ExecutionContext;

    beforeEach(() => {
        request.user = { ...authUser };

        const getRequest = jest.fn()
            .mockReturnValue(request);

        const switchToHttp = jest.fn()
            .mockReturnValue({
                getRequest
            });

        context = {
            switchToHttp
        } as any as ExecutionContext;
    });

    describe('getAuthUser', () => {
        it(
            'should extract the user object from ' +
            'the request, and create an AuthUser ' +
            'object from it',
            () => {
                expect(getAuthUser(context))
                    .toStrictEqual(authUser);
            }
        );

        it(
            'should function correctly even if ' +
            'no sessionId is part of the user object',
            () => {
                delete request.user.sessionId;

                expect(getAuthUser(context))
                    .toStrictEqual({
                        userId: 1,
                        sessionId: undefined
                    });
            }
        );

        it(
            'should throw an InternalServerError ' +
            'exception if "userId" is not present',
            () => {
                request.user = { foo: 'bar' };

                expect(() => getAuthUser(context))
                    .toThrow(new InternalServerErrorException(
                        'Missing or invalid user in request'
                    ));
            }
        );

        it(
            'should throw an InternalServerError ' +
            'exception if "user" is not present',
            () => {
                delete request.user;

                expect(() => getAuthUser(context))
                    .toThrow(new InternalServerErrorException(
                        'Missing or invalid user in request'
                    ));
            }
        );
    });

    describe('authUserParamFactory', () => {
        it(
            'builds an AuthUser from the execution ' +
            'context\'s request',
            () => {
                const result = authUserParamFactory(
                    undefined,
                    context
                );

                expect(result).toEqual(authUser);
            }
        );
    });
});
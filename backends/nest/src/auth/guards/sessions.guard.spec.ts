import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AccessGuard } from './access.guard';
import { StateGuard } from './state.guard';
import { SessionsGuard } from './sessions.guard';

describe('SessionsGuard', () => {
    let guard: SessionsGuard;
    let request: Request;

    const context = {
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn()
        })
    } as any as ExecutionContext;

    const accessGuard = {
        validateAccess: jest.fn()
    } as any as AccessGuard;

    const stateGuard = {
        validateAccess: jest.fn()
    } as any as StateGuard;

    const jwtService = {
        decode: jest.fn()
    } as any as JwtService;

    beforeEach(() => {
        guard = new SessionsGuard(
            accessGuard,
            stateGuard,
            jwtService
        );

        request = {
            headers: {
                authorization: 'bearer test-token'
            }
        } as any as Request;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canActivate', () => {
        it(
            'should choose the stateGuard to validate ' +
            'the route when a temp token is provided',
            () => {
                jest.spyOn(
                    context.switchToHttp(),
                    'getRequest'
                ).mockReturnValueOnce(request);

                jest.spyOn(
                    guard as any,
                    'extractToken'
                ).mockReturnValue('test-token');

                jest.spyOn(
                    guard as any,
                    'isTempToken'
                ).mockReturnValue(true);

                jest.spyOn(
                    stateGuard,
                    'validateAccess'
                ).mockReturnValue(true);

                expect(guard.canActivate(context))
                    .toBe(true);

                expect(stateGuard.validateAccess)
                    .toHaveBeenCalledWith(context);
            }
        );

        it(
            'should choose the accessGuard to validate ' +
            'the route when an access token is provided',
            () => {
                jest.spyOn(
                    context.switchToHttp(),
                    'getRequest'
                ).mockReturnValueOnce(request);

                jest.spyOn(
                    guard as any,
                    'extractToken'
                ).mockReturnValue('test-token');

                jest.spyOn(
                    guard as any,
                    'isTempToken'
                ).mockReturnValue(false);

                jest.spyOn(
                    accessGuard,
                    'validateAccess'
                ).mockReturnValue(true);

                expect(guard.canActivate(context))
                    .toBe(true);

                expect(accessGuard.validateAccess)
                    .toHaveBeenCalledWith(context);
            }
        );
    });

    describe('extractToken', () => {
        it(
            'should extract the bearer token from ' +
            'the authorization header',
            () => {
                expect(guard['extractToken'](request))
                    .toBe('test-token');
            }
        );

        it(
            'should return undefined when the ' +
            'authorization header doesn\'t contain ' +
            'the key word "bearer"',
            () => {
                request.headers['authorization'] =
                    'invalid test-token';

                expect(guard['extractToken'](request))
                    .toBe(undefined);
            }
        );

        it(
            'should return undefined when the ' +
            'authorization header doesn\'t exist',
            () => {
                delete request.headers['authorization'];

                expect(guard['extractToken'](request))
                    .toBe(undefined);
            }
        );
    });

    describe('isTempToken', () => {
        it(
            'should return false if an undefined ' +
            'token is provided',
            () => {
                expect(guard['isTempToken'](undefined))
                    .toBe(false);
            }
        );

        it(
            'should return true if the token ' +
            'is valid and decodes to have a claim of ' +
            'type=temp',
            () => {
                jest.spyOn(
                    jwtService,
                    'decode'
                ).mockReturnValue({
                    type: 'temp'
                });

                expect(guard['isTempToken']('test-token'))
                    .toBe(true);
            }
        );

        it(
            'should return false if the token ' +
            'decodes to a non-object',
            () => {
                jest.spyOn(
                    jwtService,
                    'decode'
                ).mockReturnValue('invalid');

                expect(guard['isTempToken']('test-token'))
                    .toBe(false);
            }
        );

        it(
            'should return false if the token ' +
            'decodes to an object that doesn\'t contain ' +
            'a type claim',
            () => {
                jest.spyOn(
                    jwtService,
                    'decode'
                ).mockReturnValue({
                    foo: 'bar'
                });

                expect(guard['isTempToken']('test-token'))
                    .toBe(false);
            }
        );

        it(
            'should return false if the token ' +
            'contains a type claim, but it doesn\'t equal "temp"',
            () => {
                jest.spyOn(
                    jwtService,
                    'decode'
                ).mockReturnValue({
                    type: 'foo-bar'
                });

                expect(guard['isTempToken']('test-token'))
                    .toBe(false);
            }
        );
    });
});
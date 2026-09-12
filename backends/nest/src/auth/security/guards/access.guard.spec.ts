import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessGuard } from './access.guard';
import { SKIP_DEFAULT_GUARD } from
        '@/auth/decorators/skip-default-guard.decorator';
import SpyInstance = jest.SpyInstance;

describe('AccessGuard', () => {
    let guard: AccessGuard;
    let reflector: jest.Mocked<Reflector>;

    const context = {
        getHandler: jest.fn(),
        getClass: jest.fn()
    } as any as ExecutionContext;

    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        } as unknown as jest.Mocked<Reflector>;

        guard = new AccessGuard(reflector);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('canActivate', () => {
        it(
            'should allow access when ' +
            'SKIP_DEFAULT_GUARD is set',
            () => {
                reflector.getAllAndOverride
                    .mockReturnValue(true);

                const validateAccess =
                    jest.spyOn(guard, 'validateAccess');

                const result =
                    guard.canActivate(context);

                expect(result).toBe(true);

                expect(reflector.getAllAndOverride)
                    .toHaveBeenCalledWith(
                        SKIP_DEFAULT_GUARD,
                        [
                            context.getHandler(),
                            context.getClass()
                        ]
                    );

                expect(validateAccess)
                    .not.toHaveBeenCalled();
            }
        );

        it(
            'should validate access when ' +
            'SKIP_DEFAULT_GUARD is not set',
            () => {
                reflector.getAllAndOverride
                    .mockReturnValue(false);

                const validateAccess =
                    jest.spyOn(guard, 'validateAccess')
                        .mockReturnValue(true);

                const result =
                    guard.canActivate(context);

                expect(result).toBe(true);
                expect(validateAccess)
                    .toHaveBeenCalledWith(context);
            }
        );

        it(
            'should validate access when ' +
            'the skip metadata is undefined',
            () => {
                reflector.getAllAndOverride
                    .mockReturnValue(undefined);

                const validateAccess =
                    jest.spyOn(guard, 'validateAccess')
                        .mockReturnValue(true);

                const result =
                    guard.canActivate(context);

                expect(result).toBe(true);
                expect(validateAccess)
                    .toHaveBeenCalledWith(context);
            }
        );
    });

    describe('validateAccess', () => {
        let spy: SpyInstance<any>;

        beforeEach(() => {
            spy = jest.spyOn(
                Object.getPrototypeOf(
                    AccessGuard.prototype
                ),
                'canActivate'
            );
        });

        it(
            'delegates to super.canActivate() and returns ' +
            'the results',
            () => {
                spy.mockReturnValue(true);

                expect(
                    guard.validateAccess(context)
                ).toBe(true);

                expect(spy)
                    .toHaveBeenCalledWith(context);
            }
        );

        it(
            'propagates a rejected/failed authentication result',
            async () => {
                spy.mockResolvedValue(false);

                await expect(
                    guard.validateAccess(context)
                ).resolves.toBe(false);

                expect(spy)
                    .toHaveBeenCalledWith(context);
        });
    });
});
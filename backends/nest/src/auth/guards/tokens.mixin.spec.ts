import { ExecutionContext } from '@nestjs/common';
import { TokensMixin } from './tokens.mixin';
import {
    SessionNotFoundException,
    InternalServerErrorException
} from '@/common/exceptions';

describe ('TokensMixin', () => {
    class BaseGuard { }

    let guard: InstanceType<ReturnType<typeof TokensMixin>>;

    beforeEach(() => {
        const MixedGuard = TokensMixin(BaseGuard);
        guard = new MixedGuard;
    });

    it('should return a user/session entity if one was found', () => {
        const entity = { id: 1 } as any;

        expect (
            guard.handleRequest(
                null,
                entity,
                null,
                {} as ExecutionContext
            )
        ).toBe(entity);
    });

    it('should throw a SessionNotFoundException if the entity was not found', () => {
        expect(() =>
            guard.handleRequest(
                null,
                undefined,
                null,
                {} as ExecutionContext
            )
        ).toThrow(
            new SessionNotFoundException(
                'Invalid token'
            )
        );
    });

    it('should throw an InternalServerErrorException when an Error is provided', () => {
        const err = new Error('test message');

        expect(() =>
            guard.handleRequest(
                err,
                undefined,
                null,
                {} as ExecutionContext
            )
        ).toThrow(
            new InternalServerErrorException(
                'test message',
                {
                    error: err
                }
            )
        );
    });

    it('should use a generic error message when the error provided is non-standard', () => {
        const nonStandardErr = {}

        expect(() =>
            guard.handleRequest(
                nonStandardErr,
                undefined,
                null,
                {} as ExecutionContext
            )
        ).toThrow(
            new InternalServerErrorException(
                'Internal server error',
                {
                    error: nonStandardErr
                }
            )
        );
    });
});

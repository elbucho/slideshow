import { ArgumentMetadata } from '@nestjs/common';
import { ValidationErrorException } from '@/common/exceptions';
import { EntityIdPipe } from './entity-id.pipe';

describe('EntityIdPipe', () => {
    let entityIdPipe: EntityIdPipe;

    beforeEach(() => {
        entityIdPipe = new EntityIdPipe();
    });

    describe('transform', () => {
        const metadata = {
            data: 'test-metadata'
        } as any as ArgumentMetadata;

        const validationError =
            new ValidationErrorException(
                'Parameter test-metadata must be ' +
                'a positive integer'
            );

        it(
            'should convert a valid string to an integer',
            () => {
                expect(
                    entityIdPipe.transform(
                        '123',
                        metadata
                    )
                ).toBe(123);
            }
        );

        it(
            'should reject non-numeric strings',
            () => {
                expect(() => entityIdPipe.transform(
                    'foo',
                    metadata
                )).toThrow(validationError);
            }
        );

        it(
            'should reject numeric non-integer strings',
            () => {
                expect(() => entityIdPipe.transform(
                    '123.45',
                    metadata
                )).toThrow(validationError);
            }
        );

        it(
            'should reject numeric integer strings that are ' +
            'less than 1',
            () => {
                expect(() => entityIdPipe.transform(
                    '-2',
                    metadata
                )).toThrow(validationError);
            }
        );
    });
});
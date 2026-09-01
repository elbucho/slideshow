import {
    parsePositiveInt,
    parseSort,
    parseExpand
} from './query-options.decorator';
import { ValidationErrorException }
    from '@/common/exceptions';

describe('QueryOptionsDecorator functions', () => {
    describe('parsePositiveInt', () => {
        it(
            'should take in a given value and convert ' +
            'it into a positive integer',
            () => {
                expect(
                    parsePositiveInt(
                        '123',
                        1,
                        'test-field'
                    )
                ).toBe(123);
            }
        );

        it(
            'should return the fallback if the value ' +
            'is undefined',
            () => {
                expect(
                    parsePositiveInt(
                        undefined,
                        1,
                        'test-field'
                    )
                ).toBe(1);
            }
        );

        it(
            'should throw a ValidationErrorException if ' +
            'the value cannot be converted into a number',
            () => {
                expect(
                    () => parsePositiveInt(
                        'foo',
                        1,
                        'test-field'
                    )
                ).toThrow(
                    new ValidationErrorException(
                        'Query parameter "test-field" must be ' +
                        'a positive integer'
                    )
                );
            }
        );

        it(
            'should throw a ValidationErrorException if ' +
            'the value converts to an integer that is less ' +
            'than 1',
            () => {
                expect(
                    () => parsePositiveInt(
                        '0',
                        1,
                        'test-field'
                    )
                ).toThrow(
                    new ValidationErrorException(
                        'Query parameter "test-field" must be ' +
                        'a positive integer'
                    )
                );
            }
        );
    });

    describe('parseSort', () => {
        it(
            'should take in a sort string from the GET parameter, ' +
            'validate all of the fields, determine the direction ' +
            'they should be sorted on, and then return an array ' +
            'of SortOption objects.',
            () => {
                expect(
                    parseSort(
                        'createdAt,-email',
                        [ 'createdAt', 'email' ]
                    )
                ).toEqual([
                    { field: 'createdAt', direction: 'ASC' },
                    { field: 'email', direction: 'DESC' }
                ]);
            }
        );

        it(
            'should return an empty array when the value ' +
            'is not a string',
            () => {
                expect(
                    parseSort(
                        1234,
                        [ 'createdAt', 'email' ]
                    )
                ).toEqual([]);
            }
        );

        it(
            'should return an empty array when the value ' +
            'is an empty string',
            () => {
                expect(
                    parseSort(
                        '',
                        [ 'createdAt', 'email' ]
                    )
                ).toEqual([]);
            }
        );

        it(
            'should throw a ValidationErrorException when ' +
            'the value provided references a field that is ' +
            'not in allowedFields',
            () => {
                expect(
                    () => parseSort(
                        'createdAt-email',
                        [ 'createdAt', 'email' ]
                    )
                ).toThrow(
                    new ValidationErrorException(
                        'Cannot sort by "createdAt-email"',
                        {
                            allowedFields: [
                                'createdAt',
                                'email'
                            ]
                        }
                    )
                );
            }
        );
    });

    describe('parseExpand', () => {
        it(
            'should take in an expand string from the GET parameter, ' +
            'validate all of the fields, and then return an array ' +
            'of field names to expand',
            () => {
                expect(
                    parseExpand(
                        'profile,roles',
                        [ 'profile', 'roles', 'user' ]
                    )
                ).toEqual([
                    'profile',
                    'roles'
                ]);
            }
        );

        it(
            'should return an empty array if the value isn\'t ' +
            'a string',
            () => {
                expect(
                    parseExpand(
                        123,
                        [ 'profile', 'roles', 'user' ]
                    )
                ).toEqual([]);
            }
        );

        it(
            'should return an empty array if the value is ' +
            'an empty string',
            () => {
                expect(
                    parseExpand(
                        '',
                        [ 'profile', 'roles', 'user' ]
                    )
                ).toEqual([]);
            }
        );

        it(
            'should throw a ValidationErrorException if the ' +
            'value contains a field that is not in allowedFields',
            () => {
                expect(
                    () => parseExpand(
                        'profile,roles,slideshows',
                        [ 'profile', 'roles', 'user' ]
                    )
                ).toThrow(
                    new ValidationErrorException(
                        'Cannot expand "slideshows"',
                        {
                            allowedFields: [
                                'profile',
                                'roles',
                                'user'
                            ]
                        }
                    )
                );
            }
        );
    });
});
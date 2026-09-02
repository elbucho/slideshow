import {
    getQueryOptions,
    defaultQueryOptions,
    defaultQueryOptionsConfig
} from './query-options.decorator';
import { ValidationErrorException }
    from '@/common/exceptions';
import { BaseEntity } from
        '@/database/entities/base.entity';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';

class TestEntity extends BaseEntity {
    name: string;
    description: string;
}

describe('getQueryOptions', () => {
    const entity = TestEntity;

    beforeEach(() => {
        jest.spyOn(
            QueryFieldRegistry,
            'get'
        ).mockReturnValue({
            sortableFields: [ 'name', 'created_at' ],
            expandableFields: [ 'user', 'profile' ],
            searchableFields: [ 'name', 'description' ]
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('parsePositiveInt', () => {
        const exception = new ValidationErrorException(
            'Query parameter "page" must be ' +
            'a positive integer'
        );

        it(
            'should take in a given value and convert ' +
            'it into a positive integer',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            page: '123'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    page: 123
                });
            }
        );

        it(
            'should return the fallback if the value ' +
            'is undefined',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            page: undefined
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    page: 1
                });
            }
        );

        it(
            'should throw a ValidationErrorException if ' +
            'the value cannot be converted into a number',
            () => {
                expect(
                    () => getQueryOptions(
                        entity,
                        {
                            page: 'foo'
                        }
                    )
                ).toThrow(exception);
            }
        );

        it(
            'should throw a ValidationErrorException if ' +
            'the value converts to an integer that is less ' +
            'than 1',
            () => {
                expect(
                    () => getQueryOptions(
                        entity,
                        {
                            page: '0'
                        }
                    )
                ).toThrow(exception);
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
                    getQueryOptions(
                        entity,
                        {
                            sort: 'name,-created_at'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    sort: [
                        {
                            field: 'name',
                            direction: 'ASC'
                        },
                        {
                            field: 'created_at',
                            direction: 'DESC'
                        }
                    ]
                });
            }
        );

        it(
            'should return an empty array when the value ' +
            'is not a string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            sort: 123
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    sort: []
                });
            }
        );

        it(
            'should return an empty array when the value ' +
            'is an empty string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            sort: ''
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    sort: []
                });
            }
        );

        it(
            'should throw a ValidationErrorException when ' +
            'the value provided references a field that is ' +
            'not in allowedFields',
            () => {
                expect(
                    () => getQueryOptions(
                        entity,
                        {
                            sort: 'description'
                        }
                    )
                ).toThrow(
                    new ValidationErrorException(
                        'Cannot sort by "description"',
                        {
                            allowedFields: [
                                'name',
                                'created_at'
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
                    getQueryOptions(
                        entity,
                        {
                            expand: 'user,profile'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    expand: [
                        'user',
                        'profile'
                    ]
                });
            }
        );

        it(
            'should return an empty array if the value isn\'t ' +
            'a string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            expand: 123
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    expand: []
                });
            }
        );

        it(
            'should return an empty array if the value is ' +
            'an empty string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            expand: ''
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    expand: []
                });
            }
        );

        it(
            'should throw a ValidationErrorException if the ' +
            'value contains a field that is not in allowedFields',
            () => {
                expect(
                    () => getQueryOptions(
                        entity,
                        {
                            expand: 'states'
                        }
                    )
                ).toThrow(
                    new ValidationErrorException(
                        'Cannot expand "states"',
                        {
                            allowedFields: [
                                'user',
                                'profile'
                            ]
                        }
                    )
                );
            }
        );
    });

    describe('pageSize', () => {
        it(
            'should return the provided page size if it ' +
            'is a positive integer that is less than or ' +
            'equal to the maxPageSize',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            page_size: '22'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    pageSize: 22
                });
            }
        );

        it(
            'should return the maxPageSize if the ' +
            'provided page_size is greater than maxPageSize',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            page_size: '212'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    pageSize: defaultQueryOptionsConfig
                        .maxPageSize
                });
            }
        );
    });

    describe('search', () => {
        it(
            'should return the user-provided search ' +
            'if it is a nonempty string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            search: 'foo'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    search: 'foo'
                });
            }
        );

        it(
            'should return undefined if the user-' +
            'provided search is not a string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            search: 123
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    search: undefined
                });
            }
        );

        it(
            'should return undefined if the user-' +
            'provided search is empty',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            search: ''
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    search: undefined
                });
            }
        );
    });

    describe('includeDeleted', () => {
        it(
            'should return true if include_deleted ' +
            'is a string, and when it is converted to ' +
            'lower-case, it equals "true"',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            include_deleted: 'TRUE'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    includeDeleted: true
                });
            }
        );

        it(
            'should return false if include_deleted ' +
            'is not a string',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            include_deleted: 123
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    includeDeleted: false
                });
            }
        );

        it(
            'should return false if include_deleted ' +
            'is a string that doesn\'t match "true"',
            () => {
                expect(
                    getQueryOptions(
                        entity,
                        {
                            include_deleted: 'yes'
                        }
                    )
                ).toEqual({
                    ...defaultQueryOptions,
                    includeDeleted: false
                });
            }
        );
    });
});
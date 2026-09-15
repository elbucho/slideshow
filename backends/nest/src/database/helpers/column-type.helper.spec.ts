import { ColumnType } from 'typeorm';
import {
    type SimplifiedColumnType,
    getSimplifiedColumnType
} from '@/database/helpers/column-type.helper';

describe('getSimplifiedColumnType', () => {
    it(
        'should map typescript simple constructors ' +
        'to a SimplifiedColumnType value',
        () => {
            const testItems: Record<
                SimplifiedColumnType,
                unknown[]
            > = {
                'number': [
                    Number,
                    Boolean
                ],
                'date': [
                    Date
                ],
                'string': [
                    String
                ],
                'structured': []
            };

            for (const [ key, value ] of Object.entries(testItems)) {
                for (const v of value) {
                    expect(
                        getSimplifiedColumnType(
                            'test',
                            v as ColumnType
                        )
                    ).toEqual(key);
                }
            }
        }
    );

    it(
        'should map type strings to a SimplifiedColumnType value',
        () => {
            const testItems: Record<
                SimplifiedColumnType,
                string[]
            > = {
                'number': [
                    'int',
                    'integer',
                    'bigint',
                    'decimal',
                    'float'
                ],
                'date': [
                    'date',
                    'timestamp',
                    'timestamptz'
                ],
                'string': [
                    'character varying',
                    'text',
                    'char',
                    'character',
                    'varchar',
                    'uuid'
                ],
                'structured': [
                    'jsonb'
                ]
            };

            for (const [ key, value ] of Object.entries(testItems)) {
                for (const v of value) {
                    expect(
                        getSimplifiedColumnType(
                            'test',
                            v as ColumnType
                        )
                    ).toEqual(key);
                }
            }
        }
    );

    it(
        'should throw an Error if the provided columnType ' +
        'is not valid',
        () => {
            expect(
                () => getSimplifiedColumnType(
                    'test',
                    Object as any as ColumnType
                )
            ).toThrow(
                new Error(
                    `Column type ${Object.name} ` +
                    `is not mapped: test`
                )
            );

            expect(
                () => getSimplifiedColumnType(
                    'test',
                    'invalid-type' as any as ColumnType
                )
            ).toThrow(
                new Error(
                    'Column type invalid-type is ' +
                    'not mapped: test'
                )
            );
        }
    );
});
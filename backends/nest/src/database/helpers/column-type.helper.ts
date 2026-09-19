import { ColumnType } from 'typeorm';

export type SimplifiedColumnType = |
    'string' |
    'date' |
    'number' |
    'structured';

export function getSimplifiedColumnType(
    field: string,
    columnType: ColumnType
): SimplifiedColumnType {
    if (typeof columnType === 'function') {
        switch (columnType) {
            case Number:
            case Boolean:
                return 'number';
            case Date:
                return 'date';
            case String:
                return 'string';
            default:
                throw Error(
                    `Column type ${columnType.name} is ` +
                    `not mapped: ${field}`
                );
        }
    }

    switch(columnType) {
        case 'int':
        case 'integer':
        case 'bigint':
        case 'decimal':
        case 'float':
            return 'number';
        case 'date':
        case 'timestamp':
        case 'timestamptz':
            return 'date';
        case 'character varying':
        case 'text':
        case 'char':
        case 'character':
        case 'varchar':
        case 'uuid':
            return 'string';
        case 'jsonb':
            return 'structured';
        default:
            throw Error(
                `Column type ${columnType} is ` +
                `not mapped: ${field}`
            );
    }
}
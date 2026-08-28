import {
    ObjectLiteral,
    SelectQueryBuilder
} from 'typeorm';
import { QueryOptions, defaultQueryOptions } from
        '@/database/decorators/query-options.decorator';

export type FilterFields =
    | { includeFields: (keyof QueryOptions)[]; excludeFields?: never }
    | { excludeFields: (keyof QueryOptions)[]; includeFields?: never };

export function applyQueryOptions<
    T extends ObjectLiteral
>(
    qb: SelectQueryBuilder<T>,
    opts: QueryOptions,
    alias: string
): SelectQueryBuilder<T> {
    qb
        .skip((opts.page -1) * opts.pageSize)
        .take(opts.pageSize);

    for (const { field, direction } of opts.sort) {
        qb.addOrderBy(
            `${alias}.${field}`,
            direction
        );
    }

    for (const relation of opts.expand) {
        qb.leftJoinAndSelect(
            `${alias}.${relation}`,
            relation
        );
    }

    if (opts.includeDeleted) {
        qb.withDeleted();
    }

    return qb;
}

export function filterOptions(
    opts: QueryOptions,
    args: FilterFields
): QueryOptions {
    let returnOpts: Partial<QueryOptions> = {};

    if (args.includeFields) {
        for (const [ key, value ] of Object.entries(opts)) {
            returnOpts[key as keyof QueryOptions] =
                args.includeFields.includes(key as keyof QueryOptions)
                    ? value
                    : defaultQueryOptions[key as keyof QueryOptions];
        }
    }

    if (args.excludeFields) {
        for (const [ key, value ] of Object.entries(opts)) {
            returnOpts[key as keyof QueryOptions] =
                args.excludeFields.includes(key as keyof QueryOptions)
                    ? defaultQueryOptions[key as keyof QueryOptions]
                    : value;
        }
    }

    return returnOpts as QueryOptions;
}
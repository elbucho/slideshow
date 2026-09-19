import {
    ExecutionContext,
    createParamDecorator
} from '@nestjs/common';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';
import { ValidationErrorException } from '@/common/exceptions';

export type FilterFields =
    | { includeFields: (keyof QueryOptions)[]; excludeFields?: never }
    | { excludeFields: (keyof QueryOptions)[]; includeFields?: never };

export interface SortOption {
    field: string;
    direction: 'ASC' | 'DESC';
}

export interface QueryOptions {
    page: number;
    pageSize: number;
    search?: string;
    sort: SortOption[];
    includeDeleted: boolean;
    expand: string[];
}

export interface QueryOptionsConfig {
    defaultPageSize?: number;
    maxPageSize?: number;
    filter?: FilterFields;
}

interface RequiredQueryOptionsConfig {
    readonly defaultPageSize: number;
    readonly maxPageSize: number;
    readonly filter?: FilterFields;
}

export const defaultQueryOptionsConfig: QueryOptionsConfig = {
    defaultPageSize: 25,
    maxPageSize: 100,
    filter: undefined
};

export const defaultQueryOptions: QueryOptions = {
    page: 1,
    pageSize: defaultQueryOptionsConfig
        .defaultPageSize as number,
    search: undefined,
    sort: [],
    includeDeleted: false,
    expand: []
}

function isPositiveSafeInteger(
    value: unknown
): value is number {
    return Number.isSafeInteger(value) &&
        (value as number) >= 1;
}

function validateQueryOptionsConfig(
    config: RequiredQueryOptionsConfig
): void {
    if (!isPositiveSafeInteger(config.defaultPageSize)) {
        throw new ValidationErrorException(
            'defaultPageSize must be a positive, ' +
            'finite integer'
        );
    }

    if (!isPositiveSafeInteger(config.maxPageSize)) {
        throw new ValidationErrorException(
            'maxPageSize must be a positive, ' +
            'finite integer'
        );
    }
}

function parsePositiveInt(
    value: unknown, fallback: number, field: string
): number {
    if (value === undefined) return fallback;

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new ValidationErrorException(
            `Query parameter "${field}" must be a positive integer`
        );
    }

    return parsed;
}

// Format: ?sort=createdAt,-email  => createdAt -> ASC, email -> DESC
function parseSort(
    value: unknown, allowedFields: string[]
): SortOption[] {
    if (typeof value !== 'string' || value.length === 0) return [];

    return value.split(',').map((entry) => {
        const isDesc = entry.startsWith('-');
        const field = isDesc ? entry.slice(1) : entry;

        if (!allowedFields.includes(field)) {
            throw new ValidationErrorException(
                `Cannot sort by "${field}"`,
                {
                    allowedFields
                }
            );
        }

        return {
            field,
            direction: isDesc ? 'DESC' : 'ASC'
        };
    });
}

// Format: ?expand=profile,roles
function parseExpand(
    value: unknown, allowedFields: string[]
): string[] {
    if (typeof value !== 'string' || value.length === 0) return [];

    const fields = value.split(',');
    const invalid = fields.filter((f) => !allowedFields.includes(f));

    if (invalid.length > 0) {
        throw new ValidationErrorException(
            `Cannot expand "${invalid.join(', ')}"`,
            {
                allowedFields
            }
        );
    }

    return fields;
}

function filterOptions(
    query: Record<string, unknown>,
    filter: FilterFields
): Record<string, unknown> {
    let returnQuery: Record<string, unknown> = {};
    let keys: string[] = [];

    if (filter.includeFields) {
        keys.push(...filter.includeFields);
    }

    if (filter.excludeFields) {
        for (const key of Object.keys(defaultQueryOptions)) {
            if (!filter.excludeFields.includes(key as keyof QueryOptions)) {
                keys.push(key);
            }
        }
    }

    for (const key of keys) {
        if (query[key]) returnQuery[key] = query[key];
    }

    return returnQuery;
}

export function getQueryOptions(
    entity: Function,
    query: Record<string, unknown>,
    options?: QueryOptionsConfig
): QueryOptions {
    const {
        defaultPageSize = defaultQueryOptionsConfig
            .defaultPageSize,
        maxPageSize = defaultQueryOptionsConfig
            .maxPageSize,
        filter = defaultQueryOptionsConfig
            .filter
    } = options ?? {};

    const config = {
        defaultPageSize,
        maxPageSize,
        filter
    } as RequiredQueryOptionsConfig;

    validateQueryOptionsConfig(config);

    const { sortableFields, expandableFields } =
        QueryFieldRegistry.get(entity);

    if (config.filter)
        query = filterOptions(query, config.filter);

    return {
        page: parsePositiveInt(
            query.page,
            1,
            'page'
        ),
        pageSize: Math.min(
            parsePositiveInt(
                query.pageSize,
                config.defaultPageSize,
                'pageSize'
            ),
            config.maxPageSize
        ),
        search:
            typeof query.search === 'string' &&
                query.search.length > 0
                    ? query.search
                    : undefined,
        sort: parseSort(query.sort, sortableFields),
        includeDeleted:
            typeof query.includeDeleted === 'string' &&
                query.includeDeleted.toLowerCase() === 'true',
        expand: parseExpand(query.expand, expandableFields)
    };
}

export function queryOptionsParamFactory(
    entity: Function,
    options: QueryOptionsConfig | undefined,
    _data: unknown,
    context: ExecutionContext
): QueryOptions {
    const request = context
        .switchToHttp()
        .getRequest();

    return getQueryOptions(
        entity,
        request.query,
        options
    );
}

export function QueryOptionsDecorator(
    entity: Function,
    options?: QueryOptionsConfig
) {
    return createParamDecorator(
        // Using Function.prototype.bind here instead of
        // the usual => notation so that the babel testing
        // engine will play nice. It is functionally identical.
        queryOptionsParamFactory.bind(
            null,
            entity,
            options
        )
    )();
}
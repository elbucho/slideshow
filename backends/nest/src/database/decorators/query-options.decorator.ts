import {
    ExecutionContext,
    createParamDecorator
} from '@nestjs/common';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';
import { ValidationErrorException } from '@/common/exceptions';

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
}

export const defaultQueryOptionsConfig: QueryOptionsConfig = {
    defaultPageSize: 25,
    maxPageSize: 100
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

export function parsePositiveInt(
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
export function parseSort(
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
export function parseExpand(
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

export function QueryOptionsDecorator(
    entity: Function,
    options?: QueryOptionsConfig
) {
    const { defaultPageSize = 25, maxPageSize = 100 } =
        options ?? {};

    return createParamDecorator(
        (_data: unknown, ctx: ExecutionContext): QueryOptions => {
            const { sortableFields, expandableFields } =
                QueryFieldRegistry.get(entity);

            const request = ctx.switchToHttp().getRequest();
            const query = request.query;

            return {
                page: parsePositiveInt(
                    query.page,
                    1,
                    'page'
                ),
                pageSize: Math.min(
                    parsePositiveInt(
                        query.page_size,
                        defaultPageSize,
                        'page_size'
                    ),
                    maxPageSize
                ),
                search: typeof query.search === 'string'
                    ? query.search
                    : undefined,
                sort: parseSort(query.sort, sortableFields),
                includeDeleted: query.include_deleted === 'true',
                expand: parseExpand(query.expand, expandableFields)
            };
        }
    )();
}
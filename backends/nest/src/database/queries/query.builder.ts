import {
    Repository,
    SelectQueryBuilder,
    ObjectLiteral,
    Brackets
} from 'typeorm';
import {
    defaultQueryOptions,
    QueryOptions
} from '@/database/decorators/query-options.decorator';
import { BaseEntity } from
        '@/database/entities/base.entity';
import {
    QueryResponse,
    ResourceType
} from '@/common/types';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    ValidationErrorException
} from '@/common/exceptions';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';

export type FilterFields =
    | { includeFields: (keyof QueryOptions)[]; excludeFields?: never }
    | { excludeFields: (keyof QueryOptions)[]; includeFields?: never };

export class QueryBuilder<TEntity extends BaseEntity> {
    private readonly queryBuilder:
        SelectQueryBuilder<TEntity>;
    private readonly searchableFields: string[];
    private options: QueryOptions | undefined;
    private whereParams: ObjectLiteral | undefined;
    private searchFields: string[] = [];

    constructor(
        repository: Repository<TEntity>,
        private readonly alias: ResourceType
    ) {
        this.queryBuilder =
            repository.createQueryBuilder(alias);

        const queryFields =
            QueryFieldRegistry.get(
                repository.metadata.target as Function
            );

        this.searchableFields = queryFields.searchableFields;
    }

    private filterOptions(
        filter: FilterFields
    ): void {
        let returnOpts: Partial<QueryOptions> = {};

        if (filter.includeFields) {
            for (
                const [ key, value ] of
                    Object.entries(this.options!)
            ) {
                returnOpts[key as keyof QueryOptions] =
                    filter.includeFields
                        .includes(key as keyof QueryOptions)
                        ? value
                        : defaultQueryOptions[
                            key as keyof QueryOptions
                        ];
            }
        }

        if (filter.excludeFields) {
            for (
                const [ key, value ] of
                    Object.entries(this.options!)
            ) {
                returnOpts[key as keyof QueryOptions] =
                    filter.excludeFields
                        .includes(key as keyof QueryOptions)
                        ? defaultQueryOptions[
                            key as keyof QueryOptions
                        ]
                        : value;
            }
        }

        this.options = returnOpts as QueryOptions;
    }

    private finalizeQuery(): this {
        if (this.options?.search)
            this.addSearch();

        return this;
    }

    private addSearch(): this {
        if (this.searchFields.length === 0) {
            throw new InternalServerErrorException(
                `Search fields were not provided for the ` +
                `query made on alias ${this.alias}`
            );
        }

        this.queryBuilder.andWhere(
            new Brackets(subQb => {
                this.searchFields.forEach((field, index) => {
                    const condition = `${this.alias}.${field} ` +
                        `ILIKE :search`;

                    if (index === 0) {
                        subQb.where(condition);
                    } else {
                        subQb.orWhere(condition);
                    }
                });
            }),
            {
                search: `%${this.options!.search!}%`
            }
        );

        return this;
    }

    where(
        where: string |
            ObjectLiteral |
            Brackets |
            ObjectLiteral[] |
            ((qb: SelectQueryBuilder<TEntity>) => string),
        parameters?: ObjectLiteral
    ): this {
        this.whereParams = parameters;
        this.queryBuilder.where(
            where,
            parameters
        );

        return this;
    }

    addSearchFields(
        fields?: string[]
    ): this {
        if (!fields || fields.length === 0)
            return this;

        fields.forEach((field) => {
            if (!this.searchableFields.includes(field)) {
                throw new ValidationErrorException(
                    `The searchable fields for alias ` +
                    `${this.alias} do not include ${field}`,
                    {
                        searchableFields: this.searchableFields
                    }
                );
            }
        });

        this.searchFields = fields;

        return this;
    }

    addOptions(
        partialOpts?: Partial<QueryOptions>,
        filters?: FilterFields
    ): this {
        this.options = partialOpts
            ? {
                ...defaultQueryOptions,
                ...partialOpts
            }
            : defaultQueryOptions;

        if (filters)
            this.filterOptions(filters);

        this.queryBuilder
            .skip(
                (this.options.page - 1) *
                this.options.pageSize
            )
            .take(this.options.pageSize);

        for (const { field, direction } of this.options.sort) {
            this.queryBuilder.addOrderBy(
                `${this.alias}.${field}`,
                direction
            );
        }

        for (const relation of this.options.expand) {
            this.queryBuilder.leftJoinAndSelect(
                `${this.alias}.${relation}`,
                relation
            );
        }

        if (this.options.includeDeleted) {
            this.queryBuilder.withDeleted();
        }

        return this;
    }

    async getManyAndCount(): Promise<
        QueryResponse<TEntity>
    > {
        this.finalizeQuery();

        const [ items, total ] =
            await this.queryBuilder
                .getManyAndCount();

        return {
            items,
            total,
            page: this.options?.page ?? undefined,
            pageSize: this.options?.pageSize ?? undefined
        }
    }

    async getMany(): Promise<TEntity[]> {
        this.finalizeQuery();

        return this.queryBuilder.getMany();
    }

    async getOne(): Promise<TEntity|null> {
        this.finalizeQuery();

        return this.queryBuilder.getOne();
    }

    async getOneOrFail(): Promise<TEntity> {
        this.finalizeQuery();

        const entity = await this.getOne();

        if (!entity) {
            const entries = Object.entries(this.whereParams ?? {});
            const keys = entries.map(([key]) => key)
                .join(',');
            let values: string | number;

            if (entries.length === 1 && Number.isInteger(entries[0][1])) {
                values = entries[0][1] as number;
            } else {
                values = entries.map(([_, value]) => String(value))
                    .join(',');
            }

            throw new ResourceNotFoundException(
                this.alias,
                keys,
                values
            );
        }

        return entity;
    }

    async getCount(): Promise<number> {
        this.finalizeQuery();

        return this.queryBuilder.getCount();
    }
}
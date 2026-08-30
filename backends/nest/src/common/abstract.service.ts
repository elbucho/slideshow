import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseEntity } from '@/database/entities/base.entity';
import { QueryBuilder } from '@/database/queries/query.builder';
import { QueryOptions } from '@/database/decorators/query-options.decorator';
import { FilterFields } from '@/database/filters/query-options.filter';
import {
    QueryResponse,
    QueryWhere,
    ResourceType
} from '@/common/types';

export abstract class AbstractService<TEntity extends BaseEntity> {
    protected readonly alias: string;

    protected constructor(
        protected readonly configService: ConfigService,
        protected readonly eventEmitter: EventEmitter2,
        protected readonly repository: Repository<TEntity>
    ) {
        this.alias = this.pascalToSnake(
            this.repository.metadata.name.toLowerCase()
        );
    }

    private pascalToSnake(name: string): string {
        return name
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
            .toLowerCase();
    }

    protected buildQuery(): QueryBuilder<TEntity> {
        return new QueryBuilder(
            this.repository,
            this.alias as ResourceType
        );
    }

    protected async findMany(
        { where, params }: QueryWhere,
        opts?: Partial<QueryOptions>,
        searchFields?: string[],
        filterFields?: FilterFields
    ): Promise<TEntity[]> {
        const qb = this.buildQuery();

        return qb.where(where, params)
            .addSearchFields(searchFields)
            .addOptions(
                opts,
                filterFields
            )
            .getMany();
    }

    protected async findManyWithCount(
        { where, params }: QueryWhere,
        opts?: Partial<QueryOptions>,
        searchFields?: string[],
        filterFields?: FilterFields
    ): Promise<QueryResponse<TEntity>> {
        const qb = this.buildQuery();

        return qb.where(where, params)
            .addSearchFields(searchFields)
            .addOptions(
                opts,
                filterFields
            )
            .getManyAndCount();
    }

    protected async findOne(
        { where, params }: QueryWhere,
        opts?: Partial<QueryOptions>,
        searchFields?: string[],
        filterFields?: FilterFields
    ): Promise<TEntity|null> {
        const qb = this.buildQuery();

        return qb.where(where, params)
            .addSearchFields(searchFields)
            .addOptions(
                opts,
                filterFields
            )
            .getOne();
    }

    protected async findOneOrFail(
        { where, params }: QueryWhere,
        opts?: Partial<QueryOptions>,
        searchFields?: string[],
        filterFields?: FilterFields
    ): Promise<TEntity> {
        const qb = this.buildQuery();

        return qb.where(where, params)
            .addSearchFields(searchFields)
            .addOptions(
                opts,
                filterFields
            )
            .getOneOrFail();
    }

    protected async findCount(
        { where, params }: QueryWhere
    ): Promise<number> {
        const qb = this.buildQuery();

        return qb.where(where, params)
            .getCount();
    }
}
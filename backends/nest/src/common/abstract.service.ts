import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseEntity } from '@/database/entities/base.entity';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';
import {
    QueryBuilder,
    FilterFields
} from '@/database/queries/query.builder';
import {
    QueryResponse,
    QueryWhere,
    ResourceType,
    PartialWithId
} from '@/common/types';
import {
    BulkEntitiesDeleteResponse
} from '@/common/dtos/bulk-entities.dto';

export abstract class AbstractService<TEntity extends BaseEntity> {
    protected readonly alias: string;

    constructor(
        protected readonly configService: ConfigService,
        protected readonly eventEmitter: EventEmitter2,
        protected readonly repository: Repository<TEntity>
    ) {
        this.alias = this.pascalToSnake(
            this.repository.metadata.name
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

    protected async findIds(
        { where, params }: QueryWhere,
        includeDeleted: boolean = false
    ): Promise<PartialWithId<TEntity>[]> {
        let select: string[] = [
            `${this.alias}.id`
        ];

        if (includeDeleted) {
            select.push(
                `${this.alias}.deleted_at`
            );
        }

        const qb = this.repository
            .createQueryBuilder()
            .select(select)
            .where(where, params);

        if (includeDeleted) {
            qb.withDeleted();
        }

        return qb.getMany();
    }

    protected async deleteWhere(
        { where, params }: QueryWhere
    ): Promise<boolean> {
        const result = await this.repository
            .createQueryBuilder()
            .softDelete()
            .where(
                where,
                params
            ).execute();

        const affected = Number(
            result.affected ?? 0
        );

        return affected >= 1;
    }

    protected async bulkDelete(
        query: QueryWhere
    ): Promise<BulkEntitiesDeleteResponse> {
        await this.deleteWhere(query);

        const results =
            await this.findIds(
                query,
                true
            );

        const foundIds: number[] = [];
        const deletedIds: number[] = [];

        for (const result of results) {
            foundIds.push(result.id);

            if (result.deletedAt !== null) {
                deletedIds.push(result.id);
            }
        }

        return {
            foundIds,
            deletedIds
        }
    }

    async save(
        entity: TEntity
    ): Promise<TEntity> {
        return this.repository.save(entity);
    }

    async saveWithRelations(
        entity: TEntity,
        relations: string[]
    ): Promise<TEntity> {
        const saved =
            await this.repository.save(entity);

        return this.findOneOrFail(
            {
                where: `${this.alias}.id = :id`,
                params: { id: saved.id }
            },
            {
                expand: relations
            }
        );
    }

    async delete(
        entity: TEntity
    ): Promise<boolean> {
        return this.deleteWhere({
            where: `${this.alias}.id = :id`,
            params: { id: entity.id }
        });
    }
}
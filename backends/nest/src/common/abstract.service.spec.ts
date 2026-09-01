import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { AbstractService } from './abstract.service';
import { QueryBuilder } from '@/database/queries/query.builder';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';
import { FilterFields } from '@/database/filters/query-options.filter';
import { QueryResponse } from '@/common/types';

class TestEntity extends BaseEntity {
    foo: string;
    bar: number;
}

class TestService extends AbstractService<TestEntity> {
    public testAlias(): string {
        return this.alias;
    }

    public testBuildQuery() {
        return this.buildQuery();
    }

    public testFindMany(
        ...args: Parameters<AbstractService<BaseEntity>['findMany']>
    ) {
        return this.findMany(...args);
    }

    public testFindManyWithCount(
        ...args: Parameters<AbstractService<BaseEntity>['findManyWithCount']>
    ) {
        return this.findManyWithCount(...args);
    }

    public testFindOne(
        ...args: Parameters<AbstractService<BaseEntity>['findOne']>
    ) {
        return this.findOne(...args);
    }

    public testFindOneOrFail(
        ...args: Parameters<AbstractService<BaseEntity>['findOneOrFail']>
    ) {
        return this.findOneOrFail(...args);
    }

    public testFindCount(
        ...args: Parameters<AbstractService<BaseEntity>['findCount']>
    ) {
        return this.findCount(...args);
    }
}

jest.mock('@/database/queries/query.builder');

describe('AbstractService', () => {
    let service: TestService;
    let repository: Repository<TestEntity>;
    let configService: ConfigService;
    let eventEmitter: EventEmitter2;

    const where = {
        where: 'test_entity.id = :id',
        params: { id: 123 }
    };

    beforeEach(() => {
        repository = {
            metadata: {
                name: 'TestEntity'
            }
        } as Repository<TestEntity>;

        configService = {} as ConfigService;
        eventEmitter = {} as EventEmitter2;

        service = new TestService(
            configService,
            eventEmitter,
            repository
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('alias', () => {
        it.each([
            ['User', 'user'],
            ['UserAccount', 'user_account'],
            ['OAuthClient', 'o_auth_client'],
            ['HTTPResponse', 'http_response'],
        ])('converts %s to %s', (name, expected) => {
            const repository = {
                metadata: { name },
            } as Repository<TestEntity>;

            const service = new TestService(
                configService,
                eventEmitter,
                repository
            );

            expect(
                service.testAlias()
            ).toBe(expected);
        });
    });

    describe('buildQuery', () => {
        it(
            'creates a QueryBuilder object using the ' +
            'repository and alias',
            () => {
                service.testBuildQuery();

                expect(QueryBuilder).toHaveBeenCalledWith(
                    repository,
                    'test_entity'
                );
            }
        );
    });

    describe('findCount', () => {
        it(
            'should return a number representing the amount ' +
            'of records found by the provided query',
            async () => {
                const response = 2;

                const qb = {
                    where: jest.fn().mockReturnThis(),
                    getCount: jest.fn()
                        .mockResolvedValue(response)
                } as any as QueryBuilder<TestEntity>;

                jest.spyOn(
                    service as any,
                    'buildQuery'
                ).mockReturnValue(qb);

                await expect(
                    service.testFindCount(
                        where
                    )
                ).resolves.toBe(response);
            }
        );
    });

        describe('Query functions', () => {
        let qb: QueryBuilder<TestEntity>;

        const opts = {
            pageSize: 10,
            page: 1,
            search: 'test'
        } as Partial<QueryOptions>;

        const filterFields = {
            includeFields: [
                'search',
                'pageSize',
                'page'
            ]
        } as FilterFields;

        const searchFields = [ 'name' ];

        beforeEach(() => {
            qb = {
                where: jest.fn().mockReturnThis(),
                addSearchFields: jest.fn().mockReturnThis(),
                addOptions: jest.fn().mockReturnThis()
            } as any as QueryBuilder<TestEntity>;
        });

        afterEach(() => {
            expect(qb.where)
                .toHaveBeenCalledWith(
                    where.where,
                    where.params
                );

            expect(qb.addSearchFields)
                .toHaveBeenCalledWith(
                    searchFields
                );

            expect(qb.addOptions)
                .toHaveBeenCalledWith(
                    opts,
                    filterFields
                );

            jest.clearAllMocks();
        });

        describe('findMany', () => {
            it(
                'performs the provided query on the db and ' +
                'returns an array of entities',
                async () => {
                    const results = [
                        new TestEntity(),
                        new TestEntity()
                    ];

                    qb = {
                        ...qb,
                        getMany: jest.fn()
                            .mockResolvedValue(results)
                    } as any as QueryBuilder<TestEntity>;

                    jest.spyOn(
                        service as any,
                        'buildQuery'
                    ).mockReturnValue(qb);

                    await expect(
                        service.testFindMany(
                            where,
                            opts,
                            searchFields,
                            filterFields
                        )
                    ).resolves.toBe(results);
                }
            );
        });

        describe('findManyWithCount', () => {
            it(
                'should perform the provided query and ' +
                'package the returned values in a QueryResponse ' +
                'object',
                async () => {
                    const response = {
                        items: [
                            new TestEntity(),
                            new TestEntity()
                        ],
                        total: 2,
                        page: 1,
                        pageSize: 10
                    } as QueryResponse<TestEntity>;

                    qb = {
                        ...qb,
                        getManyAndCount: jest.fn()
                            .mockResolvedValue(response)
                    } as any as QueryBuilder<TestEntity>;

                    jest.spyOn(
                        service as any,
                        'buildQuery'
                    ).mockReturnValue(qb);

                    await expect(
                        service.testFindManyWithCount(
                            where,
                            opts,
                            searchFields,
                            filterFields
                        )
                    ).resolves.toBe(response);
                }
            );
        });

        describe('findOne', () => {
            it(
                'should return a single entity when one ' +
                'or more records match the query',
                async () => {
                    const response = new TestEntity();

                    qb = {
                        ...qb,
                        getOne: jest.fn()
                            .mockResolvedValue(response)
                    } as any as QueryBuilder<TestEntity>;

                    jest.spyOn(
                        service as any,
                        'buildQuery'
                    ).mockReturnValue(qb);

                    await expect(
                        service.testFindOne(
                            where,
                            opts,
                            searchFields,
                            filterFields
                        )
                    ).resolves.toBe(response);
                }
            );
        });

        describe('findOneOrFail', () => {
            it(
                'should return an entity when one ' +
                'or more matching the exists in the table ' +
                'and throw a ResourceNotFoundException when ' +
                'no matching entities are found',
                async () => {
                    const response = new TestEntity();

                    qb = {
                        ...qb,
                        getOneOrFail: jest.fn()
                            .mockResolvedValue(response)
                    } as any as QueryBuilder<TestEntity>;

                    jest.spyOn(
                        service as any,
                        'buildQuery'
                    ).mockReturnValue(qb);

                    await expect(
                        service.testFindOneOrFail(
                            where,
                            opts,
                            searchFields,
                            filterFields
                        )
                    ).resolves.toBe(response);
                }
            );
        });
    });
});
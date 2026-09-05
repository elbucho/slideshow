import {
    Repository,
    SelectQueryBuilder,
    UpdateResult
} from 'typeorm';
import { BaseEntity } from '@/database/entities/base.entity';
import { AbstractService } from './abstract.service';
import { QueryBuilder } from '@/database/queries/query.builder';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';
import { FilterFields } from '@/database/queries/query.builder';
import { QueryResponse, QueryWhere} from '@/common/types';
import { User } from '@/database/entities/user.entity';
import { SoftDeleteEntity } from
        '@/database/entities/soft-delete.entity';
import {InternalServerErrorException} from "@/common/exceptions";

class TestEntity extends SoftDeleteEntity {
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

    public testFindIds(
        query: QueryWhere,
        includeDeleted?: boolean
    ) {
        if (includeDeleted) {
            return this.findIds(query, true);
        }

        return this.findIds(query);
    }

    public testDeleteWhere(
        ...args: Parameters<AbstractService<BaseEntity>['deleteWhere']>
    ) {
        return this.deleteWhere(...args);
    }

    public testBulkDelete(
        ...args: Parameters<AbstractService<BaseEntity>['bulkDelete']>
    ) {
        return this.bulkDelete(...args);
    }
}

jest.mock('@/database/queries/query.builder');

describe('AbstractService', () => {
    let service: TestService;
    let repository: Repository<TestEntity>;
    let queryBuilder: SelectQueryBuilder<TestEntity>;

    const where = {
        where: 'test_entity.id = :id',
        params: { id: 123 }
    };

    beforeEach(() => {
        queryBuilder = {
            select: jest.fn().mockReturnThis(),
            softDelete: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
            execute: jest.fn(),
            getMany: jest.fn()
        } as any as SelectQueryBuilder<TestEntity>;

        repository = {
            metadata: {
                name: 'TestEntity',
                tableName: 'test_entities'
            },
            save: jest.fn(),
            createQueryBuilder: () =>
                queryBuilder
        } as any as Repository<TestEntity>;

        service = new TestService(repository);
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

            const service = new TestService(repository);

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

    describe('findIds', () => {
        it(
            'should return an array of partial entities ' +
            'that each contain the id field',
            async () => {
                const entities = [
                    { id: 1 } as TestEntity,
                    { id: 2 } as TestEntity
                ];

                jest.spyOn(
                    queryBuilder,
                    'getMany'
                ).mockResolvedValue(
                    entities
                );

                await expect(
                    service.testFindIds({
                        where: 'test_entity.id IN :ids',
                        params: { ids: [ 1, 2 ]}
                    })
                ).resolves.toBe(entities);

                expect(queryBuilder.select)
                    .toHaveBeenCalledWith([
                        'test_entity.id'
                    ]);
            }
        );

        it(
            'should include soft deleted entities ' +
            'as well as the deleted_at field if ' +
            'includeDeleted = true',
            async () => {
                const entities = [
                    { id: 1, deletedAt: null } as TestEntity,
                    { id: 2, deletedAt: new Date } as TestEntity
                ];

                jest.spyOn(
                    queryBuilder,
                    'getMany'
                ).mockResolvedValue(
                    entities
                );

                await expect(
                    service.testFindIds(
                        {
                            where: 'test_entity.id IN :ids',
                            params: { ids: [ 1, 2 ]}
                        },
                        true
                    )
                ).resolves.toBe(entities);

                expect(queryBuilder.select)
                    .toHaveBeenCalledWith([
                        'test_entity.id',
                        'test_entity.deleted_at'
                    ]);

                expect(queryBuilder.withDeleted)
                    .toHaveBeenCalled();
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

    describe('deleteWhere', () => {
        let testService: {
            isSoftDeletable: jest.Mock
        };

        const whereClause = {
            where: 'test_entity.id IN :ids',
            params: { ids: [ 1, 2 ] }
        };

        beforeEach(() => {
            testService = service as unknown as {
                isSoftDeletable: jest.Mock
            };
        });

        it(
            'should throw an InternalServerErrorException ' +
            'if records on this table are not soft-deletable',
            async () => {
                jest.spyOn(
                    testService,
                    'isSoftDeletable'
                ).mockReturnValue(false);

                await expect(
                    service.testDeleteWhere(
                        whereClause
                    )
                ).rejects.toThrow(
                    new InternalServerErrorException(
                        'Records in this table are not ' +
                        'soft-deletable',
                        {
                            tableName: 'test_entities'
                        }
                    )
                );
            }
        );

        it(
            'should attempt to soft delete objects matching ' +
            'a provided where query, and return true on success',
            async () => {
                jest.spyOn(
                    testService,
                    'isSoftDeletable'
                ).mockReturnValue(true);

                const result = {
                    affected: 2
                } as any as UpdateResult;

                jest.spyOn(
                    queryBuilder,
                    'execute'
                ).mockResolvedValue(result);

                await expect(
                    service.testDeleteWhere(
                        whereClause
                    )
                ).resolves.toBe(true);
            }
        );

        it(
            'should return false if the result.affected ' +
            'value is undefined',
            async () => {
                jest.spyOn(
                    testService,
                    'isSoftDeletable'
                ).mockReturnValue(true);

                jest.spyOn(
                    queryBuilder,
                    'execute'
                ).mockResolvedValue({});

                await expect(
                    service.testDeleteWhere(
                        whereClause
                    )
                ).resolves.toBe(false);
            }
        );
    });

    describe('bulkDelete', () => {
        it(
            'should run a deleteWhere on the provided ' +
            'query, then run findIds with includeDeleted = ' +
            'true. It will return a response containing ' +
            'an array of found IDs and an array of deleted IDs',
            async () => {
                const testService = service as unknown as {
                    deleteWhere: jest.Mock,
                    findIds: jest.Mock
                };

                jest.spyOn(
                    testService,
                    'deleteWhere'
                ).mockResolvedValue(true);

                jest.spyOn(
                    testService,
                    'findIds'
                ).mockResolvedValue([
                    { id: 1, deletedAt: null } as TestEntity,
                    { id: 2, deletedAt: new Date() } as TestEntity
                ]);

                const where = {
                    where: 'test_entity.id IN :ids',
                    params: { ids: [ 1, 2 ] }
                };

                await expect(
                    service.testBulkDelete(where)
                ).resolves.toEqual({
                    foundIds: [ 1, 2 ],
                    deletedIds: [ 2 ]
                });

                expect(testService.deleteWhere)
                    .toHaveBeenCalledWith(where);

                expect(testService.findIds)
                    .toHaveBeenCalledWith(where, true);
            }
        );
    });

    describe('delete', () => {
        it(
            'should call deleteWhere with the ' +
            'entity.id',
            async () => {
                const testService = service as unknown as {
                    deleteWhere: jest.Mock
                };

                jest.spyOn(
                    testService,
                    'deleteWhere'
                ).mockResolvedValue(true);

                await expect(
                    service.delete(
                        { id: 1 } as TestEntity
                    )
                ).resolves.toBe(true);

                expect(testService.deleteWhere)
                    .toHaveBeenCalledWith({
                        where: 'test_entity.id = :id',
                        params: { id: 1 }
                    });
            }
        );
    });

    describe('Save functions', () => {
        const entity1 = {
            name: 'test'
        } as any as TestEntity;

        const entity2 = {
            name: 'test2'
        } as any as TestEntity;

        const savedEntity1 = {
            ...entity1,
            id: 1
        } as any as TestEntity;

        const savedEntity2 = {
            ...entity2,
            id: 2
        } as any as TestEntity;

        describe('save', () => {
            it(
                'should call this.repository.save on the ' +
                'provided entity, and return the results',
                async () => {
                    jest.spyOn(
                        repository,
                        'save'
                    ).mockResolvedValue(savedEntity1);

                    await expect(
                        service.save(entity1)
                    ).resolves.toBe(savedEntity1);
                }
            );
        });

        describe('bulkSave', () => {
            it(
                'should call this.repository.save on the ' +
                'provided entities, and return the results',
                async () => {
                    const saveSpy =
                        jest.spyOn(repository, 'save');

                    saveSpy.mockResolvedValue(
                        [
                            savedEntity1,
                            savedEntity2
                        ] as never
                    );

                    await expect(
                        service.bulkSave([
                            entity1,
                            entity2
                        ])
                    ).resolves.toEqual([
                        savedEntity1,
                        savedEntity2
                    ]);
                }
            );
        });

        describe('saveWithRelations', () => {
            it(
                'saves the entity, then runs findOneOrFail ' +
                'to get the saved entity with the passed ' +
                'relations hydrated',
                async () => {
                    const hydratedEntity = {
                        ...savedEntity1,
                        user: {} as any as User
                    };

                    const testService = service as unknown as {
                        findOneOrFail: jest.Mock
                    };

                    jest.spyOn(
                        testService,
                        'findOneOrFail'
                    ).mockResolvedValue(
                        hydratedEntity
                    );

                    jest.spyOn(
                        repository,
                        'save'
                    ).mockResolvedValue(savedEntity1);

                    await expect(
                        service.saveWithRelations(
                            entity1,
                            [ 'user' ]
                        )
                    ).resolves.toBe(hydratedEntity);
                }
            );
        });
    });
});
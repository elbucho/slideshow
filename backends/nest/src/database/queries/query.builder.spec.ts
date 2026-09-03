import {
    Brackets,
    Repository,
    SelectQueryBuilder
} from 'typeorm';
import { QueryBuilder } from './query.builder';
import { BaseEntity } from
        '@/database/entities/base.entity';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';
import { defaultQueryOptions } from
        '@/database/decorators/query-options.decorator';
import { ResourceType } from '@/common/types';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    ValidationErrorException
} from '@/common/exceptions';

class TestEntity extends BaseEntity {}

describe('QueryBuilder', () => {
    let repository: Repository<TestEntity>;
    let qb: QueryBuilder<TestEntity>;
    const sqb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        withDeleted: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn()
    } as any as jest.Mocked<SelectQueryBuilder<TestEntity>>;

    beforeEach(() => {
        repository = {
            createQueryBuilder: jest.fn().mockReturnValue(
                sqb
            ),
            metadata: {
                target: TestEntity
            }
        } as any as jest.Mocked<Repository<TestEntity>>;

        jest.spyOn(
            QueryFieldRegistry,
            'get'
        ).mockReturnValue({
            searchableFields: [ 'name', 'description' ],
            expandableFields: [ 'user', 'profile' ],
            sortableFields: [ 'name', 'created_at' ]
        });

        const alias = 'test' as ResourceType;

        qb = new QueryBuilder(
            repository,
            alias
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('where', () => {
        it(
            'should pass the where arguments to the ' +
            'SelectQueryBuilder and return this',
            () => {
                const returnValue = qb.where(
                    'test.id = :testId',
                    { testId: 1 }
                );

                expect(typeof returnValue)
                    .toEqual(typeof qb);

                expect(sqb.where)
                    .toHaveBeenCalledWith(
                        'test.id = :testId',
                        { testId: 1 }
                    );
            }
        );
    });

    describe('addSearchFields', () => {
        it(
            'should immediately return if the fields variable ' +
            'is not provided, or is an empty array',
            () => {
                const returnValue1=
                    qb.addSearchFields();

                expect(typeof returnValue1)
                    .toEqual(typeof qb);

                const returnValue2 =
                    qb.addSearchFields([]);

                expect(typeof returnValue2)
                    .toEqual(typeof qb);
            }
        );

        it(
            'should throw a ValidationErrorException if ' +
            'the fields array contains a field that doesn\'t ' +
            'exist in the searchableFields array',
            () => {
                expect(
                    () => qb.addSearchFields([
                        'invalid-field'
                    ])
                ).toThrow(
                    new ValidationErrorException(
                        'The searchable fields for alias test ' +
                        'do not include invalid-field',
                        {
                            searchableFields: [
                                'name',
                                'description'
                            ]
                        }
                    )
                );
            }
        );
    });

    describe('addOptions', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it(
            'should set the provided options, call querybuilder.skip ' +
            'and querybuilder.take for page and pageSize, respectively',
            () => {
                const result = qb.addOptions();

                expect(
                    typeof result
                ).toEqual(typeof qb);

                expect(
                    sqb.skip
                ).toHaveBeenCalledWith(
                    (defaultQueryOptions.page - 1) *
                        defaultQueryOptions.pageSize
                );

                expect(
                    sqb.take
                ).toHaveBeenCalledWith(
                    defaultQueryOptions.pageSize
                );
            }
        );

        it(
            'should call querybuilder.addOrderBy for ' +
            'each of the sort directives passed in',
            () => {
                qb.addOptions({
                    sort: [
                        {
                            field: 'name',
                            direction: 'ASC'
                        },
                        {
                            field: 'created_at',
                            direction: 'DESC'
                        }
                    ]
                });

                expect(
                    sqb.addOrderBy
                ).toHaveBeenCalledTimes(2);

                expect(
                    sqb.addOrderBy
                ).toHaveBeenNthCalledWith(
                    1,
                    'test.name',
                    'ASC'
                );

                expect(
                    sqb.addOrderBy
                ).toHaveBeenNthCalledWith(
                    2,
                    'test.created_at',
                    'DESC'
                );
            }
        );

        it(
            'should call querybuilder.leftJoinAndSelect ' +
            'for each relation passed in the expand field',
            () => {
                qb.addOptions({
                    expand: [
                        'user',
                        'profile'
                    ]
                });

                expect(
                    sqb.leftJoinAndSelect
                ).toHaveBeenCalledTimes(2);

                expect(
                    sqb.leftJoinAndSelect
                ).toHaveBeenNthCalledWith(
                    1,
                    'test.user',
                    'user'
                );

                expect(
                    sqb.leftJoinAndSelect
                ).toHaveBeenNthCalledWith(
                    2,
                    'test.profile',
                    'profile'
                );
            }
        );

        it(
            'should call querybuilder.withDeleted if ' +
            'the includeDeleted option is set',
            () => {
                qb.addOptions({
                    includeDeleted: true
                });

                expect(
                    sqb.withDeleted
                ).toHaveBeenCalled();
            }
        );

        it(
            'should apply the includeFields filter via the ' +
            'filterOptions method',
            () => {
                qb.addOptions(
                    {
                        sort: [
                            {
                                field: 'name',
                                direction: 'ASC'
                            }
                        ],
                        expand: [ 'user' ]
                    },
                    {
                        includeFields: [
                            'sort'
                        ]
                    }
                );

                expect(
                    sqb.addOrderBy
                ).toHaveBeenCalledWith(
                    'test.name',
                    'ASC'
                );

                expect(
                    sqb.leftJoinAndSelect
                ).not.toHaveBeenCalled();
            }
        );

        it(
            'should apply the includeFields filter via the ' +
            'filterOptions method',
            () => {
                qb.addOptions(
                    {
                        sort: [
                            {
                                field: 'name',
                                direction: 'ASC'
                            }
                        ],
                        expand: [ 'user' ]
                    },
                    {
                        excludeFields: [
                            'sort'
                        ]
                    }
                );

                expect(
                    sqb.leftJoinAndSelect
                ).toHaveBeenCalledWith(
                    'test.user',
                    'user'
                );

                expect(
                    sqb.addOrderBy
                ).not.toHaveBeenCalled();
            }
        );
    });

    describe('addSearch', () => {
        it(
            'should throw an InternalServerErrorException ' +
            'if no searchFields were provided',
            async () => {
                await expect(
                    qb.addOptions({
                        search: 'test'
                    }).getManyAndCount()
                ).rejects.toThrow(
                    new InternalServerErrorException(
                        'Search fields were not provided for ' +
                        'the query made on alias test'
                    )
                );
            }
        );

        it(
            'should call querybuilder.andWhere for all ' +
            'search fields',
            async () => {
                sqb.getCount.mockResolvedValue(12);

                await expect(
                    qb.addOptions({
                        search: 'test'
                    }).addSearchFields([
                        'name',
                        'description'
                    ]).getCount()
                ).resolves.toBe(12);

                expect(sqb.andWhere).toHaveBeenCalledTimes(1);

                const [ brackets, parameters ] =
                    sqb.andWhere.mock.calls[0] as [
                        Brackets,
                        Record<string, string>
                    ]

                expect(brackets).toBeInstanceOf(
                    Brackets
                );

                expect(parameters).toEqual({
                    search: '%test%'
                });

                const subQb = {
                    where: jest.fn(),
                    orWhere: jest.fn()
                };

                brackets.whereFactory(subQb as any);

                expect(subQb.where)
                    .toHaveBeenCalledWith(
                        'test.name ILIKE :search'
                    );

                expect(subQb.orWhere)
                    .toHaveBeenCalledWith(
                        'test.description ILIKE :search'
                    );
            }
        );
    });

    describe('getManyAndCount', () => {
        it(
            'should return just items and total if ' +
            'addOptions was not called',
            async () => {
                sqb.getManyAndCount
                    .mockResolvedValue([
                        [ new TestEntity() ],
                        1
                    ]);

                await expect(
                    qb.getManyAndCount()
                ).resolves.toEqual({
                    items: [ new TestEntity() ],
                    total: 1
                });
            }
        );

        it(
            'should return a full QueryResponse object ' +
            'if addOptions was called',
            async () => {
                sqb.getManyAndCount
                    .mockResolvedValue([
                        [ new TestEntity() ],
                        1
                    ]);

                await expect(
                    qb.addOptions({
                        expand: [ 'user' ]
                    }).getManyAndCount()
                ).resolves.toEqual({
                    items: [ new TestEntity() ],
                    total: 1,
                    page: defaultQueryOptions.page,
                    pageSize: defaultQueryOptions.pageSize
                });
            }
        );
    });

    describe('getMany', () => {
        it(
            'should run finalizeQuery and return the ' +
            'results of sqb.getMany()',
            async () => {
                const entityArray = [
                    new TestEntity(),
                    new TestEntity()
                ];

                sqb.getMany
                    .mockResolvedValue(entityArray);

                await expect(
                    qb.getMany()
                ).resolves.toBe(
                    entityArray
                );
            }
        );
    });

    describe('getOne', () => {
        it(
            'should run finalizeQuery and return the ' +
            'results of sqb.getOne()',
            async () => {
                const entity = new TestEntity();

                sqb.getOne
                    .mockResolvedValue(entity);

                await expect(
                    qb.getOne()
                ).resolves.toBe(
                    entity
                );
            }
        );
    });

    describe('getOneOrFail', () => {
        it(
            'should run finalizeQuery and return the ' +
            'results of sqb.getOne() if it returns an ' +
            'entity',
            async () => {
                const entity = new TestEntity();

                sqb.getOne
                    .mockResolvedValue(entity);

                await expect(
                    qb.getOneOrFail()
                ).resolves.toBe(
                    entity
                );
            }
        );

        it(
            'should throw a ResourceNotFoundException ' +
            'if no entity is returned',
            async () => {
                sqb.getOne.mockResolvedValue(null);

                await expect(
                    qb.where(
                        'id = :id',
                        { id: 1 }
                    ).getOneOrFail()
                ).rejects.toThrow(
                    new ResourceNotFoundException(
                        'test' as ResourceType,
                        'id',
                        1
                    )
                );
            }
        );

        it(
            'should make a compound identifier for the ' +
            'ResourceNotFoundException if more than one ' +
            'field is queried',
            async () => {
                sqb.getOne.mockResolvedValue(null);

                await expect(
                    qb.where(
                        'user_id = :userId AND state_id = :stateId',
                        {
                            userId: 1,
                            stateId: 12
                        }
                    ).getOneOrFail()
                ).rejects.toThrow(
                    new ResourceNotFoundException(
                        'test' as ResourceType,
                        'userId,stateId',
                        '1,12'
                    )
                );
            }
        );
    });

    describe('getCount', () => {
        it(
            'should return a count of the matching records',
            async () => {
                sqb.getCount.mockResolvedValue(8);

                await expect(
                    qb.getCount()
                ).resolves.toBe(8);
            }
        );
    });
});
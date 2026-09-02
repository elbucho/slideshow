import { Repository, SelectQueryBuilder} from 'typeorm';
import {
    QueryBuilder,
    FilterFields
} from './query.builder';
import { BaseEntity } from
        '@/database/entities/base.entity';
import { QueryFieldRegistry } from
        '@/database/queries/query-field.registry';
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
    } as any as SelectQueryBuilder<TestEntity>;

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

    })
});
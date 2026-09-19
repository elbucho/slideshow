import { DataSource } from 'typeorm';
import { QueryFieldRegistry } from
        './query-field.registry';
import { QueryFieldRegistryService } from
        './query-field-registry.service';
import { BaseEntity } from
        '@/database/entities/base.entity';
import { isExcludedFromSort } from
        '@/database/helpers/sort-exclusion.helper';

jest.mock(
    '@/database/helpers/sort-exclusion.helper',
    () => ({
        isExcludedFromSort: jest.fn()
    })
);

class TestEntity extends BaseEntity {}
class ExcludeEntity extends BaseEntity {}
class CircularEntity extends BaseEntity {}
class DeepEntity1 extends BaseEntity {}
class DeepEntity2 extends BaseEntity {}
class DeepEntity3 extends BaseEntity {}
class DeepEntity4 extends BaseEntity {}

describe('QueryFieldRegistryService', () => {
    let service: QueryFieldRegistryService;

    const excludeEntityMetadata = {
        target: ExcludeEntity,
        relations: []
    };

    const deepEntity4Metadata = {
        target: DeepEntity4,
        relations: []
    };

    const deepEntity3Metadata = {
        target: DeepEntity3,
        relations: [
            {
                propertyName: 'deepEntity4',
                inverseEntityMetadata: deepEntity4Metadata
            }
        ]
    };

    const deepEntity2Metadata = {
        target: DeepEntity2,
        relations: [
            {
                propertyName: 'deepEntity3',
                inverseEntityMetadata: deepEntity3Metadata
            }
        ]
    };

    const deepEntity1Metadata = {
        target: DeepEntity1,
        relations: [
            {
                propertyName: 'deepEntity2',
                inverseEntityMetadata: deepEntity2Metadata
            }
        ]
    };

    const testEntityMetadata = {
        target: TestEntity,
        columns: [
            {
                propertyName: 'id',
                type: 'int'
            },
            {
                propertyName: 'name',
                type: 'varchar'
            },
            {
                propertyName: 'description',
                type: 'varchar'
            },
            {
                propertyName: 'created_at',
                type: 'timestamptz'
            },
            {
                propertyName: 'updated_at',
                type: 'timestamptz'
            },
            {
                propertyName: 'deleted_at',
                type: 'timestamptz'
            }
        ],
        relations: [
            {
                propertyName: 'excludeEntity',
                inverseEntityMetadata: excludeEntityMetadata
            },
            {
                propertyName: 'deepEntity1',
                inverseEntityMetadata: deepEntity1Metadata
            }
        ]
    };

    const circularEntityMetadata = {
        target: CircularEntity,
        relations: [
            {
                propertyName: 'testEntity',
                inverseEntityMetadata: testEntityMetadata
            }
        ]
    };

    testEntityMetadata.relations.push({
        propertyName: 'circularEntity',
        inverseEntityMetadata: circularEntityMetadata
    } as any as never);

    const exclusions = [
        'excludeEntity'
    ];

    const dataSource = {
        entityMetadatas: [
            testEntityMetadata
        ]
    } as any as DataSource;

    beforeEach(() => {
        const isExcludedFromSortMock =
            jest.mocked(
                isExcludedFromSort
            );

        isExcludedFromSortMock.mockImplementation(
            (_, propertyName): boolean =>
                exclusions.includes(propertyName)
        );

        service = new QueryFieldRegistryService(dataSource);
    });

    it(
        'should loop through the metadata objects ' +
        'in the provided DataSource object and register ' +
        'the sortable fields, expandable fields, and ' +
        'searchable fields for each',
        () => {
            service.onModuleInit();

            expect(QueryFieldRegistry.get(TestEntity))
                .toStrictEqual({
                    sortableFields: [
                        'id',
                        'name',
                        'description',
                        'created_at',
                        'updated_at',
                        'deleted_at'
                    ],
                    expandableFields: [
                        'deepEntity1',
                        'deepEntity1.deepEntity2',
                        'deepEntity1.deepEntity2.deepEntity3',
                        'deepEntity1.deepEntity2.deepEntity3.deepEntity4',
                        'circularEntity'
                    ],
                    searchableFields: [
                        'name',
                        'description'
                    ]
                });
        }
    );
});
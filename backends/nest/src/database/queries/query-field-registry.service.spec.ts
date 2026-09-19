import { DataSource } from 'typeorm';
import { QueryFieldRegistry } from
        './query-field.registry';
import { QueryFieldRegistryService } from
        './query-field-registry.service';
import { BaseEntity } from
        '@/database/entities/base.entity';

class TestEntity extends BaseEntity {}
class TestRelation1 extends BaseEntity {}
class TestRelation2 extends BaseEntity {}

describe('QueryFieldRegistryService', () => {
    let service: QueryFieldRegistryService;

    const testRelation2Metadata = {
        target: TestRelation2,
        columns: [
            {
                propertyName: 'id',
                type: 'int'
            },
            {
                propertyName: 'fake_column',
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
        relations: []
    };

    const testRelation1Metadata = {
        target: TestRelation1,
        columns: [
            {
                propertyName: 'id',
                type: 'int'
            },
            {
                propertyName: 'foo',
                type: 'varchar'
            },
            {
                propertyName: 'bars',
                type: 'int'
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
                propertyName: 'testRelation2',
                inverseEntityMetadata: testRelation2Metadata
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
                propertyName: 'testRelation1',
                inverseEntityMetadata: testRelation1Metadata
            }
        ]
    };

    const dataSource = {
        entityMetadatas: [
            testEntityMetadata,
            testRelation1Metadata,
            testRelation2Metadata
        ]
    } as any as DataSource;

    beforeEach(() => {
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
                        'testRelation1',
                        'testRelation1.testRelation2'
                    ],
                    searchableFields: [
                        'name',
                        'description'
                    ]
                });
        }
    );
});
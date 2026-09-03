import { DataSource } from 'typeorm';
import { QueryFieldRegistry } from
        './query-field.registry';
import { QueryFieldRegistryService } from
        './query-field-registry.service';
import { BaseEntity } from
        '@/database/entities/base.entity';

class TestEntity extends BaseEntity {}

describe('QueryFieldRegistryService', () => {
    let service: QueryFieldRegistryService;

    const dataSource = {
        entityMetadatas: [
            {
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
                        propertyName: 'user'
                    },
                    {
                        propertyName: 'roles'
                    }
                ]
            }
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
                        'user',
                        'roles'
                    ],
                    searchableFields: [
                        'name',
                        'description'
                    ]
                });
        }
    );
});
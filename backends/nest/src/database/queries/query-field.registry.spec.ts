import { InternalServerErrorException } from
        '@/common/exceptions';
import { BaseEntity } from
        '@/database/entities/base.entity';
import { User } from
        '@/database/entities/user.entity';
import {
    EntityQueryFields,
    QueryFieldRegistry
} from '@/database/queries/query-field.registry';

class TestEntity extends BaseEntity {}

describe('QueryFieldRegistry', () => {
    const fields = {
        sortableFields: [ 'name', 'created_at' ],
        expandableFields: [ 'user', 'profile' ],
        searchableFields: [ 'name', 'description' ]
    } as EntityQueryFields;

    it(
        'should register and retrieve EntityQueryFields ' +
        'for a provided Entity',
        () => {
            QueryFieldRegistry.register(
                TestEntity,
                fields
            );

            expect(
                QueryFieldRegistry.get(TestEntity)
            ).toBe(fields);
        }
    );

    it(
        'should throw an InternalServerErrorException ' +
        'if the provided entity was not registered',
        () => {
            expect(
                () => QueryFieldRegistry.get(
                    User
                )
            ).toThrow(
                new InternalServerErrorException(
                    'No query fields registered for entity User'
                )
            );
        }
    );
});
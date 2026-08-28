import { InternalServerErrorException } from '@/common/exceptions';

export interface EntityQueryFields {
    sortableFields: string[];
    expandableFields: string[];
}

export class QueryFieldRegistry {
    private static registry =
        new WeakMap<Function, EntityQueryFields>();

    static register(
        entity: Function,
        fields: EntityQueryFields
    ): void {
        this.registry.set(entity, fields);
    }

    static get(entity: Function): EntityQueryFields {
        const fields =
            this.registry.get(entity);

        if (!fields) {
            throw new InternalServerErrorException(
                `No query fields registered for entity ${entity.name}`
            );
        }

        return fields;
    }
}
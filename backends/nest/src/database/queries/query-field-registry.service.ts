import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryFieldRegistry } from './query-field.registry';

@Injectable()
export class QueryFieldRegistryService implements OnModuleInit {
    constructor(
        private dataSource: DataSource
    ) {}

    onModuleInit() {
        const textTypes = new Set([
            'varchar',
            'character varying',
            'text',
            'char',
            'character'
        ]);

        for (const metadata of this.dataSource.entityMetadatas) {
            QueryFieldRegistry.register(metadata.target as Function, {
                sortableFields: metadata.columns.map(
                    (c) => c.propertyName
                ),
                expandableFields: metadata.relations.map(
                    (r) => r.propertyName
                ),
                searchableFields: metadata.columns
                    .filter(c =>
                        typeof c.type === 'string' &&
                        textTypes.has(c.type)
                    ).map(c => c.propertyName)
            });
        }
    }
}
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryFieldRegistry } from './query-field.registry';

@Injectable()
export class QueryFieldRegistryService implements OnModuleInit {
    constructor(
        private dataSource: DataSource
    ) {}

    onModuleInit() {
        for (const metadata of this.dataSource.entityMetadatas) {
            QueryFieldRegistry.register(metadata.target as Function, {
                sortableFields: metadata.columns.map(
                    (c) => c.propertyName
                ),
                expandableFields: metadata.relations.map(
                    (r) => r.propertyName
                )
            });
        }
    }
}
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryFieldRegistry } from './query-field.registry';
import { isExcludedFromSort } from
        '@/database/helpers/sort-exclusion.helper';
import { getSimplifiedColumnType } from
        '@/database/helpers/column-type.helper';

@Injectable()
export class QueryFieldRegistryService implements OnModuleInit {
    constructor(
        private readonly dataSource: DataSource
    ) { }

    onModuleInit(): void {
        for (const metadata of this.dataSource.entityMetadatas) {
            const target = metadata.target as Function;

            const isExcluded =
                (propertyName: string): boolean =>
                    isExcludedFromSort(
                        target,
                        propertyName
                    );

            QueryFieldRegistry.register(target, {
                sortableFields: metadata.columns
                    .filter(c => !isExcluded(
                        c.propertyName
                    )).map(c => {
                        return c.propertyName
                    }),
                expandableFields: metadata.relations
                    .filter(r => !isExcluded(
                        r.propertyName
                    )).map(r => r.propertyName),
                searchableFields: metadata.columns
                    .filter(c => {
                        const columnType = getSimplifiedColumnType(
                            c.propertyName,
                            c.type
                        );

                        return columnType === 'string' &&
                            !isExcluded(c.propertyName);
                    }).map(c => c.propertyName)
            });
        }
    }
}
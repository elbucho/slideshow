import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityMetadata} from 'typeorm';
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

    private buildExpansionPaths(
        metadata: EntityMetadata,
        maxDepth: number = 4,
        ancestors: ReadonlySet<unknown> = new Set(),
        prefix = ''
    ): string[] {
        const target = metadata.target as Function;
        const currentPath = new Set(ancestors).add(target);
        const paths: string[] = [];

        for (const relation of metadata.relations) {
            if (isExcludedFromSort(target, relation.propertyName)) {
                continue;
            }

            const inverse = relation.inverseEntityMetadata;

            if (currentPath.has(inverse.target)) {
                continue;
            }

            const separator = prefix.length > 0 ? '.' : '';
            const path = `${prefix}${separator}${relation.propertyName}`;
            paths.push(path);

            if (maxDepth > 1) {
                paths.push(
                    ...this.buildExpansionPaths(
                        inverse,
                        maxDepth - 1,
                        currentPath,
                        `${path}`
                    )
                );
            }
        }

        return paths;
    }

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
                expandableFields: this.buildExpansionPaths(
                    metadata
                ),
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
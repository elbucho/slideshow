import { defaultMetadataStorage } from
        'class-transformer/cjs/storage';

export function isExcludedFromSort(
    target: Function,
    propertyName: string
): boolean {
    return !!defaultMetadataStorage
        .findExcludeMetadata(
            target,
            propertyName
        );
}
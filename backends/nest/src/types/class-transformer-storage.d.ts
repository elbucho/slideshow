declare module 'class-transformer/cjs/storage' {
    export interface ExcludeMetadata {
        target: Function;
        propertyName: string;
        options: {
            toClassOnly?: boolean;
            toPlainOnly?: boolean
        };
    }

    export interface MetadataStorage {
        findExcludeMetadata(
            target: Function,
            propertyName: string
        ): ExcludeMetadata | undefined;
        getStrategy(
            target: Function
        ): 'excludeAll' | 'exposeAll';
        findExposeMetadata(
            target: Function,
            propertyName: string
        ): unknown;
    }

    export const defaultMetadataStorage: MetadataStorage;
}
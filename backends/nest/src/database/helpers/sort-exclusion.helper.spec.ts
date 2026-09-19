import { defaultMetadataStorage } from
        'class-transformer/cjs/storage';

describe('class-transformer internal API', () => {
    it(
        'still exposes defaultMetadataStorage.' +
        'findExcludeMetadata', () => {
            expect(defaultMetadataStorage).toBeDefined();
            expect(
                typeof defaultMetadataStorage
                    .findExcludeMetadata
            ).toBe('function');
        }
    );
});

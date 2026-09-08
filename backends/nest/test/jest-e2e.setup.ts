import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { createToSatisfyApiSpec } from
        "./matchers/to-satisfy-api-spec";

async function setupOpenApiMatcher(): Promise<void> {
    const { OpenAPIMockValidator } =
        await import('openapi-mock-validator');

    const contents = await readFile(
        '/app/openapi.yml',
        'utf8'
    );

    const spec = load(contents) as any;

    const validator =
        new OpenAPIMockValidator(spec);

    await validator.init();

    expect.extend({
        toSatisfyApiSpec:
            createToSatisfyApiSpec({
                validator
            })
    });
}

setupOpenApiMatcher().catch(error => {
    console.error(
        'Failed to initialize OpenAPI matcher:',
        error
    );

    process.exit(1);
});
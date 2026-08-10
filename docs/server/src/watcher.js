import { exec } from 'node:child_process';

console.log('Bundling OpenAPI specification...');

exec(
    'redocly bundle /spec/openapi.yml -o /generated/openapi.yml',
    (error, stdout, stderr) => {
        if (stdout) {
            console.log(stdout);
        }

        if (stderr) {
            console.error(stderr);
        }

        if (error) {
            console.error('✗ Bundle failed.');
            process.exit(1);
        }

        console.log('✓ Bundle updated.');
    }
)
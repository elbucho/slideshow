import { ConfigObject } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const VARIABLE_REGEX = /%([^%{]+)({([^}]+)})?%/g;

function interpolate(
    config: string
): string {
    return config.replace(
        VARIABLE_REGEX,
        (
            _,
            variable,
            __,
            defaultValue
        ): string => {
            const value = process.env[variable];

            if (value !== undefined) {
                return value;
            }

            if (defaultValue !== undefined) {
                return defaultValue;
            }

            throw new Error(
                `Environment variable "${variable}" is not defined`
            );
        }
    );
}

export default function configuration(): ConfigObject {
    const filename = join(
        __dirname,
        'config.yml'
    );

    const contents = readFileSync(
        filename,
        'utf8'
    );

    const interpolated = interpolate(
        contents
    );

    return yaml.load(interpolated) as ConfigObject;
}
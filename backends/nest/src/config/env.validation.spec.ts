import { validate } from './env.validation';

describe('env.validation', () => {
    let config: Record<string, any>;

    beforeEach(() => {
        config = {
            NODE_ENV: 'test',
            POSTGRES_HOST: 'test-host',
            POSTGRES_DATABASE: 'test-database',
            POSTGRES_USERNAME: 'test-username',
            POSTGRES_PASSWORD: 'test-password',
            JWT_ACCESS_SECRET: 'test-secret',
            JWT_REFRESH_SECRET: 'test-secret',
            JWT_MFA_SECRET: 'test-secret'
        };
    })

    it('should verify that all required variables are set', () => {
        const configTest = validate(config);

        expect(configTest).toBeDefined();

        delete config['NODE_ENV'];

        expect(() => validate(config)).toThrow(
            'NODE_ENV'
        );
    });

    it('should enforce the @IsIn directive', () => {
        config['NODE_ENV'] = 'invalid';

        expect(() => validate(config)).toThrow(
            'NODE_ENV'
        );
    });

    it('should enforce the @IsNotEmpty directive', () => {
        config['POSTGRES_HOST'] = '';

        expect(() => validate(config)).toThrow(
            'POSTGRES_HOST'
        );
    });

    it('should enforce the @IsInt directive', () => {
        config['POSTGRES_PORT'] = 'asdf';

        expect(() => validate(config)).toThrow(
            'POSTGRES_PORT'
        );

        config['POSTGRES_PORT'] = 123.24;

        expect(() => validate(config)).toThrow(
            'POSTGRES_PORT'
        );

        config['POSTGRES_PORT'] = "1234";

        const configTest = validate(config);

        expect(configTest).toBeDefined();
    });

    it('should enforce the @IsBoolean directive', () => {
        for (
            const variation of [
                'true',
                'TRUE',
                'TrUe',
                'false',
                'FALSE',
                'FAlsE'
            ]
        ) {
            config['POSTGRES_SYNC'] = variation;
            const configTest = validate(config);

            expect(configTest).toBeDefined();
        }

        for (
            const variation of [
                1,
                0,
                'yes',
                'no',
                'banana'
            ]
        ) {
            config['POSTGRES_SYNC'] = variation;

            expect(() => validate(config)).toThrow(
                'POSTGRES_SYNC'
            );
        }
    });
});
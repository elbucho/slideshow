import configuration from './configuration';

describe('configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            NODE_ENV: 'test',
            POSTGRES_HOST: 'test-host',
            POSTGRES_PORT: '1234',
            POSTGRES_DATABASE: 'test-database',
            POSTGRES_USERNAME: 'test-username',
            POSTGRES_PASSWORD: 'test-password',
            JWT_ACCESS_SECRET: 'test-secret',
            JWT_REFRESH_SECRET: 'test-secret',
            JWT_TEMP_SECRET: 'test-secret',
            JWT_MFA_SECRET: 'test-secret'
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it(
        'should interpolate environment variables',
        () => {
            const config = configuration();

            expect(config).toEqual(
                expect.objectContaining({
                    database: expect.objectContaining({
                        host: 'test-host',
                        port: 1234
                    }),
                    jwt: expect.objectContaining({
                        access: expect.objectContaining({
                            secret: 'test-secret'
                        })
                    })
                })
            );
        }
    );

    it(
        'should use the default when an ' +
        'environment variable is not defined',
        () => {
            delete process.env.POSTGRES_PORT;

            const config = configuration();

            expect(config).toEqual(
                expect.objectContaining({
                    database: expect.objectContaining({
                        host: 'test-host',
                        port: 5432
                    }),
                    jwt: expect.objectContaining({
                        access: expect.objectContaining({
                            secret: 'test-secret'
                        })
                    })
                })
            );
        }
    );

    it(
        'should throw an Error when a required ' +
        'environment variable is missing',
        () => {
            delete process.env.POSTGRES_HOST;

            expect(() => configuration()).toThrow(
                'Environment variable "POSTGRES_HOST" ' +
                'is not defined'
            );
        }
    );

    it(
        'should prefer the environment variable ' +
        'over the default',
        () => {
            process.env.POSTGRES_PORT = '5433';

            const config = configuration();

            expect(config).toEqual(
                expect.objectContaining({
                    database: expect.objectContaining({
                        port: 5433
                    })
                })
            );
        }
    );
});
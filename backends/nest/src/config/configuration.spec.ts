import configuration from './configuration';

describe('configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it(
        'should interpolate environment variables',
        () => {
            process.env.POSTGRES_HOST = 'test-host';
            process.env.JWT_ACCESS_SECRET = 'secret';

            const config = configuration();

            expect(config).toEqual(
                expect.objectContaining({
                    database: expect.objectContaining({
                        host: 'test-host'
                    }),
                    jwt: expect.objectContaining({
                        access: expect.objectContaining({
                            secret: 'secret'
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
            process.env.POSTGRES_HOST = 'test-host';
            process.env.JWT_ACCESS_SECRET = 'secret';

            const config = configuration();

            expect(config).toEqual(
                expect.objectContaining({
                    database: expect.objectContaining({
                        host: 'test-host',
                        port: 5432
                    }),
                    jwt: expect.objectContaining({
                        access: expect.objectContaining({
                            secret: 'secret'
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
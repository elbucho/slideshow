import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CredentialsGuard } from './credentials.guard';
import { ValidationErrorException } from '@/common/exceptions';

jest.mock('@nestjs/passport', () => {
    return {
        AuthGuard: jest.fn(() => {
            return class {
                canActivate() {
                    return Promise.resolve(true);
                }
            };
        })
    };
});

describe('CredentialsGuard', () => {
    let guard: CredentialsGuard;
    let context: ExecutionContext;

    beforeEach(() => {
        guard = new CredentialsGuard();

        context = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn()
            })
        } as unknown as ExecutionContext;
    });

    it(
        'should allow a request containing both ' +
        '"username" and "password"',
        async () => {
            const request = {
                body: {
                    username: 'user@example.com',
                    password: 'password'
                }
            };

            jest.spyOn(
                context.switchToHttp(),
                'getRequest'
            ).mockReturnValueOnce(request as Request);

            await expect(
                guard.canActivate(context)
            ).resolves.toBe(true);
        }
    );

    it(
        'should throw a ValidationErrorException ' +
        'if username or password is missing',
        async () => {
            for (
                const field of [
                    'username',
                    'password'
                ] as const
            ) {
                const request = {
                    body: {
                        username: 'user@example.com',
                        password: 'password'
                    }
                };

                delete request.body[field];

                jest.spyOn(
                    context.switchToHttp(),
                    'getRequest'
                ).mockReturnValueOnce(
                    request as Request
                );

                await expect(
                    guard.canActivate(context)
                ).rejects.toThrow(
                    new ValidationErrorException(
                        'The request body ' +
                        'contains an invalid schema',
                        {
                            missingFields: [ field ]
                        }
                    )
                );
            }
        }
    );
});
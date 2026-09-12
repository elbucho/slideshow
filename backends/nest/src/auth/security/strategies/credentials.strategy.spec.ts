import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { SecurityService } from '@/auth/security/security.service';
import { AuthUser } from '@/auth/decorators/auth-user.decorator';
import { CredentialsStrategy } from './credentials.strategy';
import {
    InternalServerErrorException,
    PayloadTooLargeException
} from '@/common/exceptions';
import {
    AuthEvents,
    UnknownServerErrorEvent
} from '@/events/auth.events';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';

describe('CredentialsStrategy', () => {
    let strategy: CredentialsStrategy;
    let securityService: jest.Mocked<SecurityService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const authUser = {
        userId: 1,
        sessionId: 1,
    } as any as AuthUser;

    const request = {
        ip: '127.0.0.1'
    } as any as Request;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: ''
    } as AuthContext;

    beforeAll(() => {
        securityService = {
            verifyCredentials: jest.fn()
        } as any as jest.Mocked<SecurityService>;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as jest.Mocked<EventEmitter2>;

        strategy = new CredentialsStrategy(
            securityService,
            eventEmitter
        );
    });

    describe('validate', () => {
        it(
            'should get a user if the credentials are correct',
            async () => {
                securityService.verifyCredentials
                    .mockResolvedValueOnce(authUser);

                await expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).resolves.toBe(authUser);

                expect(securityService.verifyCredentials)
                    .toHaveBeenCalledWith(
                        'test@example.com',
                        'testPassword',
                        authContext
                    );
            }
        );

        it(
            'should throw the same exception if a ' +
            'BaseException is thrown',
            async () => {
                const exception = new PayloadTooLargeException(
                    'Test exception'
                );

                securityService.verifyCredentials
                    .mockRejectedValueOnce(exception);

                await expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).rejects.toBeInstanceOf(
                    PayloadTooLargeException
                );
            }
        )

        it(
            'should throw an internal server error if ' +
            'an exception that doesn\'t extend BaseException ' +
            'is thrown',
            async () => {
                const exception = {
                    message: 'test message credentials.strategy'
                };

                securityService.verifyCredentials
                    .mockRejectedValueOnce(exception);

                await expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).rejects.toBeInstanceOf(
                    InternalServerErrorException
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.UNKNOWN_SERVER_ERROR,
                        new UnknownServerErrorEvent(
                            'test@example.com',
                            '127.0.0.1',
                            exception
                        )
                    );
            }
        );

        it(
            'should throw an internal server error ' +
            'with a default message if an exception is thrown ' +
            'that doesn\'t extend BaseException and doesn\'t ' +
            'contain a message key',
            async () => {
                securityService.verifyCredentials
                    .mockRejectedValueOnce({});

                await expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).rejects.toThrow(
                    new InternalServerErrorException(
                        'Internal server error'
                    )
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.UNKNOWN_SERVER_ERROR,
                        new UnknownServerErrorEvent(
                            'test@example.com',
                            '127.0.0.1',
                            {}
                        )
                    );
            }
        );
    });
});
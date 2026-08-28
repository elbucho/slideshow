import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/database/entities/user.entity';
import { CredentialsStrategy } from './credentials.strategy';
import {
    InternalServerErrorException,
    InvalidCredentialsException,
    PayloadTooLargeException,
    ResourceNotFoundException
} from '@/common/exceptions';
import {
    AuthEvents,
    UnknownServerErrorEvent,
    UserNotFoundEvent
} from '@/events/auth.events';

describe('CredentialsStrategy', () => {
    let strategy: CredentialsStrategy;
    let authService: jest.Mocked<AuthService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const user = {
        id: 1
    } as any as User;

    const request = {
        ip: '127.0.0.1'
    } as any as Request;

    beforeAll(() => {
        authService = {
            getUserFromCredentials: jest.fn()
        } as any as jest.Mocked<AuthService>;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as jest.Mocked<EventEmitter2>;

        strategy = new CredentialsStrategy(
            authService,
            eventEmitter
        );
    });

    describe('validate', () => {
        it(
            'should get a user if the credentials are correct',
            async () => {
                authService.authenticateCredentials
                    .mockResolvedValueOnce(user);

                await expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).resolves.toBe(user);

                expect(authService.authenticateCredentials)
                    .toHaveBeenCalledWith(
                        'test@example.com',
                        'testPassword',
                        request
                    );
            }
        );

        it(
            'should throw an InvalidCredentialsException ' +
            'if the user is not found',
            async () => {
                authService.authenticateCredentials
                    .mockRejectedValueOnce(
                        new ResourceNotFoundException(
                            'user',
                            'username',
                            'test@example.com'
                        )
                    );

                await expect(
                    strategy.validate(
                        request,
                        'test@example.com',
                        'testPassword'
                    )
                ).rejects.toBeInstanceOf(
                    InvalidCredentialsException
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.USER_NOT_FOUND,
                        new UserNotFoundEvent(
                            'test@example.com',
                            '127.0.0.1'
                        )
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

                authService.authenticateCredentials
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

                authService.authenticateCredentials
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
    });
});
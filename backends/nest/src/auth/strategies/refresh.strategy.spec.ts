import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/database/entities/user.entity';
import { RefreshStrategy } from './refresh.strategy';
import { RefreshTokenPayload } from '@/tokens/dtos/tokens.dto';
import {
    InternalServerErrorException,
    InvalidImageException,
    ResourceNotFoundException,
    SessionNotFoundException
} from '@/common/exceptions';
import {
    AuthEvents,
    SessionNotFoundEvent,
    UnknownServerErrorEvent,
} from '@/events/auth.events';

describe('RefreshStrategy', () => {
    let strategy: RefreshStrategy;
    let authService: jest.Mocked<AuthService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const request = {
        ip: '127.0.0.1',
        headers: {
            authorization: "Bearer test-token"
        }
    } as any as Request;

    const user = {
        id: 1
    } as any as User;

    const payload = {
        sub: 1,
        sid: 123
    } as any as RefreshTokenPayload;


    beforeAll(() => {
        authService = {
            getUserFromRefreshToken: jest.fn()
        } as any as jest.Mocked<AuthService>;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as jest.Mocked<EventEmitter2>;

        const configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        configService.get
            .mockReturnValue('test-secret-refresh');

        strategy = new RefreshStrategy(
            authService,
            eventEmitter,
            configService
        );
    });

    describe('validate', () => {
        it(
            'should get a user if the token is valid',
            async () => {
                authService.authenticateRefreshToken
                    .mockResolvedValueOnce(user);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).resolves.toBe(user);

                expect(authService.authenticateRefreshToken)
                    .toHaveBeenCalledWith(
                        'test-token',
                        123,
                        request
                    );
            }
        );

        it(
            'should throw an InvalidCredentialsException ' +
            'if the session is not found',
            async () => {
                authService.authenticateRefreshToken
                    .mockRejectedValueOnce(
                        new ResourceNotFoundException(
                            'session',
                            'id',
                            123
                        )
                    );

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).rejects.toBeInstanceOf(
                    SessionNotFoundException
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.SESSION_NOT_FOUND,
                        new SessionNotFoundEvent(
                            payload.sub,
                            payload.sid,
                            '127.0.0.1',
                            ''
                        )
                    );
            }
        );

        it(
            'should throw the same exception if a ' +
            'BaseException is thrown',
            async () => {
                const exception = new InvalidImageException(
                    'Test exception'
                );

                authService.authenticateRefreshToken
                    .mockRejectedValueOnce(exception);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).rejects.toBeInstanceOf(
                    InvalidImageException
                );
            }
        );

        it(
            'should throw an internal server error if ' +
            'an exception that doesn\'t extend BaseException ' +
            'is thrown',
            async () => {
                const exception = {
                    message: 'test message refresh.strategy'
                };

                authService.authenticateRefreshToken
                    .mockRejectedValueOnce(exception);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).rejects.toBeInstanceOf(
                    InternalServerErrorException
                );

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        AuthEvents.UNKNOWN_SERVER_ERROR,
                        new UnknownServerErrorEvent(
                            `User id: ${payload.sub}`,
                            '127.0.0.1',
                            exception
                        )
                    );
            }
        );
    });
});
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SecurityService } from '@/auth/security/security.service';
import { RefreshStrategy } from './refresh.strategy';
import { RefreshTokenPayload } from '@/tokens/dtos/tokens.dto';
import {
    InternalServerErrorException, InvalidCredentialsException,
    InvalidImageException
} from '@/common/exceptions';
import {
    AuthEvents,
    UnknownServerErrorEvent,
} from '@/events/auth.events';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';

describe('RefreshStrategy', () => {
    let strategy: RefreshStrategy;
    let securityService: jest.Mocked<SecurityService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const request = {
        ip: '127.0.0.1',
        headers: {
            authorization: 'Bearer test-token'
        }
    } as Request;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: ''
    } as AuthContext;

    const authUser = {
        userId: 1,
        sessionId: 123
    } as any as AuthUser;

    const payload = {
        sub: 1,
        sid: 123,
        type: 'refresh'
    } as RefreshTokenPayload;

    beforeAll(() => {
        securityService = {
            verifyRefreshToken: jest.fn()
        } as any as jest.Mocked<SecurityService>;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as jest.Mocked<EventEmitter2>;

        const configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        configService.get
            .mockReturnValue('test-secret-refresh');

        strategy = new RefreshStrategy(
            securityService,
            eventEmitter,
            configService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validate', () => {
        it(
            'should get a user if the token is valid',
            async () => {
                securityService.verifyRefreshToken
                    .mockResolvedValueOnce(authUser);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).resolves.toBe(authUser);

                expect(securityService.verifyRefreshToken)
                    .toHaveBeenCalledWith(
                        'test-token',
                        authUser,
                        authContext
                    );
            }
        );

        it(
            'should throw an InvalidCredentialsException ' +
            'if the payload doesn\'t contain a sid claim',
            async () => {
                await expect(
                    strategy.validate(
                        request,
                        {
                            sub: 1
                        } as any as RefreshTokenPayload
                    )
                ).rejects.toThrow(
                    new InvalidCredentialsException(
                        'Invalid token'
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

                securityService.verifyRefreshToken
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

                securityService.verifyRefreshToken
                    .mockRejectedValueOnce(exception);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).rejects.toThrow(
                    new InternalServerErrorException(
                        exception.message
                    )
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

        it(
            'should throw an internal server error ' +
            'with a default message if an exception is thrown ' +
            'that doesn\'t extend BaseException and doesn\'t ' +
            'contain a message key',
            async () => {
                securityService.verifyRefreshToken
                    .mockRejectedValueOnce({});

                await expect(
                    strategy.validate(
                        request,
                        payload
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
                            `User id: ${payload.sub}`,
                            '127.0.0.1',
                            {}
                        )
                    );
            }
        );
    });
});
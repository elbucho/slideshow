import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/database/entities/user.entity';
import { StateStrategy } from './state.strategy';
import { TempTokenPayload } from '@/tokens/dtos/tokens.dto';
import {
    InternalServerErrorException,
    ResourceNotFoundException,
    SessionNotFoundException,
    UnsupportedMediaTypeException
} from '@/common/exceptions';
import {
    AuthEvents,
    StateNotFoundEvent,
    UnknownServerErrorEvent,
} from '@/events/auth.events';

describe('StateStrategy', () => {
    let strategy: StateStrategy;
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
    } as any as TempTokenPayload;

    beforeAll(() => {
        authService = {
            getUserFromTemporaryToken: jest.fn()
        } as any as jest.Mocked<AuthService>;

        const configService = {
            get: jest.fn()
        } as any as jest.Mocked<ConfigService>;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as jest.Mocked<EventEmitter2>;

        configService.get
            .mockReturnValue('test-secret-state');

        strategy = new StateStrategy(
            authService,
            eventEmitter,
            configService
        );
    });

    describe('validate', () => {
        it(
            'should get a user if the token is valid',
            async () => {
                authService.authenticateTemporaryToken
                    .mockResolvedValueOnce(user);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).resolves.toBe(user);

                expect(authService.authenticateTemporaryToken)
                    .toHaveBeenCalledWith(
                        'test-token',
                        123,
                        request
                    );
            }
        );

        it(
            'should throw an InvalidCredentialsException ' +
            'if the user_state is not found',
            async () => {
                authService.authenticateTemporaryToken
                    .mockRejectedValueOnce(
                        new ResourceNotFoundException(
                            'user_state',
                            'id',
                            1
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
                        AuthEvents.STATE_NOT_FOUND,
                        new StateNotFoundEvent(
                            payload.sub,
                            payload.sid,
                            '127.0.0.1'
                        )
                    );
            }
        );

        it(
            'should throw the same exception if a ' +
            'BaseException is thrown',
            async () => {
                const exception = new UnsupportedMediaTypeException(
                    'Test exception'
                );

                authService.authenticateTemporaryToken
                    .mockRejectedValueOnce(exception);

                await expect(
                    strategy.validate(
                        request,
                        payload
                    )
                ).rejects.toBeInstanceOf(
                    UnsupportedMediaTypeException
                );
            }
        );

        it(
            'should throw an internal server error if ' +
            'an exception that doesn\'t extend BaseException ' +
            'is thrown',
            async () => {
                const exception = {
                    message: 'test message state.strategy'
                };

                authService.authenticateTemporaryToken
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
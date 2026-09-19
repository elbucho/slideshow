import type { LoggerService } from '@nestjs/common';
import {
    UserLoggedInEvent,
    UserLoggedOutEvent,
    UserAccountLockedEvent,
    LockedUserLoginAttemptEvent,
    UserLoginFailedEvent,
    TokenMismatchEvent,
    UserNotFoundEvent,
    UnknownServerErrorEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent
} from '@/events/auth.events';
import { LogListener } from './log.listener';

describe('LogListener', () => {
    let listener: LogListener;
    let logger: LoggerService;

    const userId = 1;
    const sessionId = 12;
    const ipAddr = '127.0.0.1';
    const userAgent = 'test-agent';
    const email = 'test@example.com';

    beforeEach(() => {
        logger = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as jest.Mocked<LoggerService>;

        listener = new LogListener(logger);
    });

    afterEach(() => {
        jest.clearAllMocks()
    });

    describe('handleUserLoggedIn', () => {
        it(
            'should log the UserLoggedInEvent',
            async () => {
                await listener.handleUserLoggedIn(
                    new UserLoggedInEvent(
                        userId,
                        sessionId,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.log)
                    .toHaveBeenCalledWith(
                        'User logged in',
                        {
                            userId,
                            sessionId,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleUserLoggedOut', () => {
        it(
            'should log the UserLoggedOutEvent',
            async () => {
                await listener.handleUserLoggedOut(
                    new UserLoggedOutEvent(
                        userId,
                        sessionId
                    )
                );

                expect(logger.log)
                    .toHaveBeenCalledWith(
                        'User logged out',
                        {
                            userId,
                            sessionId
                        }
                    );
            }
        );
    });

    describe('handleInvalidPassword', () => {
        it(
            'should log the UserLoginFailedEvent',
            async () => {
                await listener.handleInvalidPassword(
                    new UserLoginFailedEvent(
                        userId,
                        email,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'User failed login',
                        {
                            reason: 'Invalid password',
                            userId,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleLockedUserLogin', () => {
        it(
            'should log the LockedUserLoginAttemptEvent',
            async () => {
                await listener.handleLockedUserLogin(
                    new LockedUserLoginAttemptEvent(
                        userId,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'User failed login',
                        {
                            reason: 'Account is locked',
                            userId,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleUserAccountLocked', () => {
        it(
            'should log the UserAccountLockedEvent',
            async () => {
                await listener.handleUserAccountLocked(
                    new UserAccountLockedEvent(
                        userId,
                        ipAddr,
                        userAgent,
                        'AUTO',
                        'test'
                    )
                );

                expect(logger.warn)
                    .toHaveBeenCalledWith(
                        'User account locked',
                        {
                            reason: 'test',
                            lockedBy: 'AUTO',
                            userId,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleUserNotFound', () => {
        it(
            'should log the UserNotFoundEvent',
            async () => {
                await listener.handleUserNotFound(
                    new UserNotFoundEvent(
                        email,
                        ipAddr
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'User failed login',
                        {
                            reason: 'Invalid username / email',
                            identifier: email,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleUnknownServerError', () => {
        it(
            'should log the UnknownServerErrorEvent',
            async () => {
                const exception = new Error('test');

                await listener.handleUnknownServerError(
                    new UnknownServerErrorEvent(
                        'test',
                        ipAddr,
                        exception
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'User failed login',
                        {
                            reason: 'Unknown server error',
                            identifier: 'test',
                            ipAddr,
                            exception
                        }
                    );
            }
        );
    });

    describe('handleSessionNotFound', () => {
        it(
            'should log the SessionNotFoundEvent',
            async () => {
                await listener.handleSessionNotFound(
                    new SessionNotFoundEvent(
                        userId,
                        sessionId,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'Token auth failed',
                        {
                            reason: 'No matching session found',
                            userId,
                            sessionId,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleSessionTokenExpired', () => {
        it(
            'should log the SessionTokenExpiredEvent',
            async () => {
                const expiredAt = new Date(Date.now() - 10000);

                await listener.handleSessionTokenExpired(
                    new SessionTokenExpiredEvent(
                        'refresh',
                        sessionId,
                        userId,
                        expiredAt,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'Token auth failed',
                        {
                            reason: 'refresh token expired',
                            userId,
                            sessionId,
                            expiredAt,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleTokenSessionMismatch', () => {
        it(
            'should log the TokenMismatchEvent',
            async () => {
                await listener.handleTokenSessionMismatch(
                    new TokenMismatchEvent(
                        sessionId,
                        userId,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'Token auth failed',
                        {
                            type: 'Session',
                            reason: 'Token hash doesn\'t match',
                            sessionId,
                            userId,
                            ipAddr
                        }
                    );
            }
        );
    });

    describe('handleTokenStateMismatch', () => {
        it(
            'should log the TokenMismatchEvent',
            async () => {
                const userStateId = 13;

                await listener.handleTokenStateMismatch(
                    new TokenMismatchEvent(
                        userStateId,
                        userId,
                        ipAddr,
                        userAgent
                    )
                );

                expect(logger.error)
                    .toHaveBeenCalledWith(
                        'Token auth failed',
                        {
                            type: 'UserState',
                            reason: 'Token hash doesn\'t match',
                            userStateId,
                            userId,
                            ipAddr
                        }
                    );
            }
        );
    });
});
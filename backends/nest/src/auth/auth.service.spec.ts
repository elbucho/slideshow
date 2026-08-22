import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { UsersService } from '@/users/users.service';
import { AuditService } from '@/audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AuditEvents } from '@/audit/audit.events';
import { LoggerModule } from '@/logger/logger.module';
import {
    ResourceNotFoundException,
    InvalidCredentialsException,
    InternalServerErrorException,
    SessionNotFoundException, SessionExpiredException
} from '@/common/exceptions';
import configuration from '@/config/configuration';
import { validate } from '@/config/env.validation';

describe('AuthService', () => {
    let authService: AuthService;
    let user: User;
    let session: Session;
    let request: Request;
    let isLockedOutMock: jest.MockedFunction<User['isLockedOut']>;
    let verifyPasswordMock: jest.MockedFunction<User['verifyPassword']>;
    let verifyTokenMock: jest.MockedFunction<Session['verifyToken']>;

    const sessionsServiceMock = {
        getOrCreateSession: jest.fn(),
        saveSession: jest.fn(),
        deleteSession: jest.fn(),
        findByUserId: jest.fn()
    };

    const usersServiceMock = {
        findByUsernameOrEmail: jest.fn(),
        save: jest.fn()
    };

    const auditServiceMock = {
        getRecentFailedLoginCount: jest.fn()
    };

    const eventEmitterMock = {
        emitAsync: jest.fn()
    };

    beforeAll(async () => {
        const app: TestingModule = await Test.createTestingModule({
            imports: [
                await ConfigModule.forRoot({
                    isGlobal: true,

                    load: [
                        configuration
                    ],

                    validate,
                }),
                LoggerModule
            ],
            controllers: [],
            providers: [
                AuthService,
                {
                    provide: SessionsService,
                    useValue: sessionsServiceMock
                },
                {
                    provide: UsersService,
                    useValue: usersServiceMock
                },
                {
                    provide: AuditService,
                    useValue: auditServiceMock
                },
                {
                    provide: EventEmitter2,
                    useValue: eventEmitterMock
                }
            ],
        }).compile();

        authService = app.get<AuthService>(AuthService);

        isLockedOutMock = jest.fn();
        verifyPasswordMock = jest.fn();
        verifyTokenMock = jest.fn();

        user = {
            id: 1,
            isLockedOut: isLockedOutMock,
            verifyPassword: verifyPasswordMock,
            lock: jest.fn()
        } as unknown as User;

        session = {
            id: 1,
            userId: 1,
            user: user,
            userAgent: 'jest-test',
            ipAddress: '127.0.0.1',
            setToken: jest.fn(),
            verifyToken: verifyTokenMock
        } as unknown as Session;

        request = {
            ip: '127.0.0.1',
            headers: {
                'user-agent': 'jest-test'
            }
        } as Request;

        sessionsServiceMock.getOrCreateSession
            .mockResolvedValue(session);

        sessionsServiceMock.findByUserId
            .mockResolvedValue([session]);

        usersServiceMock.findByUsernameOrEmail
            .mockResolvedValue(user);
    });

    beforeEach(async () => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        beforeEach(() => {
            jest.spyOn(authService, 'createAccessToken')
                .mockReturnValueOnce('access-token');

            jest.spyOn(authService, 'createRefreshToken')
                .mockReturnValueOnce('refresh-token');
        });

        it('should find an existing, or create a new session', async () => {
            await authService.login(user, request);

            expect(sessionsServiceMock.getOrCreateSession).toHaveBeenCalledTimes(1);
        });

        it('should create access & refresh tokens', async () => {
            await authService.login(user, request);

            expect(authService.createAccessToken).toHaveBeenCalledWith(
                user,
                session
            );

            expect(authService.createRefreshToken).toHaveBeenCalledWith(
                user,
                session
            );
        });

        it('should save the refresh token to the session and set its expiration date', async () => {
            await authService.login(user, request);

            expect(session.setToken).toHaveBeenCalledWith('refresh-token');
            expect(session.tokenExpiresAt).toBeInstanceOf(Date);
            expect(sessionsServiceMock.saveSession).toHaveBeenCalledTimes(1);
        });

        it('should trigger a login event', async () => {
            await authService.login(user, request);

            expect(eventEmitterMock.emitAsync).toHaveBeenCalledWith(
                AuditEvents.LOGGED_IN,
                expect.anything()
            );
        });

        it('should return the access and refresh tokens to the caller', async () => {
            const tokens =
                await authService.login(user, request);

            expect(tokens).toEqual({
                access_token: 'access-token',
                refresh_token: 'refresh-token'
            });
        });
    });

    describe('logout', () => {
        it('should log the user out', async () => {
            await authService.logout(session);

            expect(sessionsServiceMock.deleteSession).toHaveBeenCalledWith(session);
        });
    });

    describe('verifyUser', () => {
        beforeEach(() => {
            isLockedOutMock.mockResolvedValue(false);
            verifyPasswordMock.mockResolvedValue(true);
        });

        const email = 'test@email.com';
        const password = 'testpass1234';

        it('should locate a user, if one exists in the database', async () => {
            const returnedUser= await authService.verifyUser(email, password, request);

            expect(usersServiceMock.findByUsernameOrEmail).toHaveBeenCalledWith(email);
            expect(returnedUser).toEqual(user);
        });

        it('should throw an InvalidCredentialsException if the user isn\'t found', async () => {
            usersServiceMock.findByUsernameOrEmail.mockRejectedValueOnce(
                new ResourceNotFoundException('User not found')
            );

            await expect(
                authService.verifyUser(email, password, request)
            ).rejects.toThrow(
                new InvalidCredentialsException('Invalid username or password')
            );
        });

        it('should throw an internal server error if an unexpected exception is thrown', async () => {
            usersServiceMock.findByUsernameOrEmail.mockRejectedValueOnce(
                new Error('unexpected error')
            );

            await expect(
                authService.verifyUser(email, password, request)
            ).rejects.toThrow(
                new InternalServerErrorException('unexpected error')
            );

            usersServiceMock.findByUsernameOrEmail.mockRejectedValueOnce(
                {}
            );

            await expect(
                authService.verifyUser(email, password, request)
            ).rejects.toThrow(
                new InternalServerErrorException('Internal server error')
            );
        });

        it('should test whether the user is locked out', async () => {
            await authService.verifyUser(email, password, request);

            expect(user.isLockedOut).toHaveBeenCalledTimes(1);
        });

        it(
            'should emit a LOCKED_USER_LOGIN_ATTEMPT event and throw ' +
            'an InvalidCredentialsException if the user is locked out',
            async () => {
                isLockedOutMock.mockResolvedValueOnce(true);

                await expect(
                    authService.verifyUser(email, password, request)
                ).rejects.toThrow(
                    new InvalidCredentialsException('Account is currently locked out')
                );

                expect(eventEmitterMock.emitAsync).toHaveBeenCalledWith(
                    AuditEvents.LOCKED_USER_LOGIN_ATTEMPT,
                    expect.anything()
                );
            }
        );

        it(
            'should emit a LOGIN_FAILED event and throw an ' +
            'InvalidCredentialsException when the password is incorrect',
            async () => {
                verifyPasswordMock.mockResolvedValueOnce(false);

                await expect(
                    authService.verifyUser(email, password, request)
                ).rejects.toThrow(
                    new InvalidCredentialsException('Invalid username or password')
                );

                expect(eventEmitterMock.emitAsync).toHaveBeenCalledWith(
                    AuditEvents.LOGIN_FAILED,
                    expect.anything()
                );
            }
        );

        it('should check whether it should lock the account on login failure', async () => {
            isLockedOutMock.mockResolvedValueOnce(false);
            verifyPasswordMock.mockResolvedValueOnce(false);
            jest.spyOn(authService, 'hasXRecentFailedLogins')
                .mockResolvedValueOnce(true);

            await expect(
                authService.verifyUser(email, password, request)
            ).rejects.toThrow(
                new InvalidCredentialsException('Invalid username or password')
            );

            expect(user.lock).toHaveBeenCalledTimes(1);

            expect(eventEmitterMock.emitAsync).toHaveBeenLastCalledWith(
                AuditEvents.USER_ACCOUNT_LOCKED,
                expect.anything()
            );
        });
    });

    describe('verifyToken', () => {
        beforeEach(() => {
            verifyTokenMock.mockResolvedValue(true);
        })

        const token = 'test-token';
        const userId = 1;

        it('should locate all of the active sessions of the provided user ID', async () => {
            const fetchedUser = await authService.verifyToken(token, userId);

            expect(fetchedUser).toEqual(user);
        });

        it(
            'should throw a SessionNotFoundException if no ' +
            'session matches the provided token',
            async () => {
                verifyTokenMock.mockResolvedValueOnce(false);

                await expect(
                    authService.verifyToken(token, userId)
                ).rejects.toThrow(
                    new SessionNotFoundException('Invalid token')
                );
            }
        );

        it('should throw a SessionExpiredException if the user\'s session is expired', async () => {
            session.tokenExpiresAt = new Date(Date.now() - 10);

            await expect(
                authService.verifyToken(token, userId)
            ).rejects.toThrow(
                new SessionExpiredException(
                    'Session expired',
                    {
                        token_expired_at: session.tokenExpiresAt
                    }
                )
            );
        });
    });

    describe('hasXRecentFailedLogins', () => {
        const loginPeriod = 15 * 60 * 1000;     // 15 minutes

        it(
            'should return false if the user has not exceeded the ' +
            'maximum number of logins within a recent period',
            async () => {
                auditServiceMock.getRecentFailedLoginCount
                    .mockResolvedValueOnce(0);

                const exceededLimit = await authService.hasXRecentFailedLogins(
                    user,
                    loginPeriod
                );

                expect(exceededLimit).toBe(false);
            }
        );

        it(
            'should return true if the user has exceeded the ' +
            'maximum number of logins within a recent period',
            async () => {
                auditServiceMock.getRecentFailedLoginCount
                    .mockResolvedValueOnce(20);

                const exceededLimit = await authService.hasXRecentFailedLogins(
                    user,
                    loginPeriod
                );

                expect(exceededLimit).toBe(true);
            }
        );
    });

    describe('createAccessToken', () => {
        it('should return the new accessToken', () => {
            const accessToken = authService.createAccessToken(
                user,
                session
            );

            expect(typeof(accessToken)).toBe('string');
        });
    });

    describe('createRefreshToken', () => {
        it('should return the new refreshToken', () => {
            const refreshToken = authService.createRefreshToken(
                user,
                session
            );

            expect(typeof(refreshToken)).toBe('string');
        });
    });

    describe('revokeSession', () => {
        it('should delete the session and emit a new SESSION_REVOKED event', async () => {
            await authService.revokeSession(session, 'test', request);

            expect(sessionsServiceMock.deleteSession).toHaveBeenCalledWith(session);
            expect(eventEmitterMock.emitAsync).toHaveBeenCalledWith(
                AuditEvents.SESSION_REVOKED,
                expect.anything()
            );
        });
    });
});
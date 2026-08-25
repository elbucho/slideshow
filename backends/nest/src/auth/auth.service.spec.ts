import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { SessionsService } from '@/auth/sessions/sessions.service';
import { UsersService } from '@/users/users.service';
import { AuditService } from '@/audit/audit.service';
import { UserStatesService } from '@/states/user-states.service';
import { User } from '@/database/entities/user.entity';
import { Session } from '@/database/entities/session.entity';
import { AuditEvents } from '@/audit/audit.events';
import { LoggerModule } from '@/logger/logger.module';
import configuration from '@/config/configuration';
import { validate } from '@/config/env.validation';
import { AuthContext } from '@/common/types';
import { UserLoggedOutEvent } from '@/events/auth.events';

describe('AuthService', () => {
    let authService: AuthService;
    let user: User;
    let session: Session;
    let context: AuthContext;
    let request: Request;
    let hasStateMock: jest.MockedFunction<User['hasState']>;
    let verifyPasswordMock: jest.MockedFunction<User['verifyPassword']>;
    let verifyTokenMock: jest.MockedFunction<Session['verifyToken']>;

    const sessionsServiceMock = {
        getOrCreateSession: jest.fn(),
        saveSession: jest.fn(),
        deleteSession: jest.fn(),
        findByUserId: jest.fn(),
        findById: jest.fn(),
    };

    const usersServiceMock = {
        findByUsernameOrEmail: jest.fn(),
        setState: jest.fn(),
        save: jest.fn()
    };

    const userStatesServiceMock = {
        findById: jest.fn()
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
                    provide: UserStatesService,
                    useValue: userStatesServiceMock
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

        hasStateMock = jest.fn();
        verifyPasswordMock = jest.fn();
        verifyTokenMock = jest.fn();

        user = {
            id: 1,
            hasState: hasStateMock,
            verifyPassword: verifyPasswordMock,
        } as unknown as User;

        context = {
            userId: 1,
            sessionId: 1,
        } as unknown as AuthContext;

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
            sessionsServiceMock.findById
                .mockResolvedValue(session);

            await authService.logout(context.userId, context.sessionId, request);

            expect(sessionsServiceMock.deleteSession).toHaveBeenCalledWith(session);
            expect(eventEmitterMock.emitAsync).toHaveBeenCalledWith(
                AuditEvents.LOGGED_OUT,
                new UserLoggedOutEvent(
                    session.userId,
                    session.id
                )
            )
        });
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
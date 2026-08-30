import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from '@/database/entities/session.entity';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';

describe('SessionsController', () => {
    let sessionsController: SessionsController;
    let authUser: AuthUser;

    const sessionsService = {
        findActiveUserSessions: jest.fn(),
        findByAuthUser: jest.fn(),
        deleteMany: jest.fn(),
        deleteOne: jest.fn()
    } as any as SessionsService;

    const authContext = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
    } as AuthContext;

    const opts = {} as any as QueryOptions;

    beforeEach(() => {
        sessionsController = new SessionsController(
            sessionsService
        );

        authUser = {
            userId: 1,
            sessionId: 123
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getSessions', () => {
        it(
            'should return a QueryResponse object ' +
            'with active user sessions',
            async () => {
                const queryResponse = {
                    items: [],
                    total: 0
                };

                jest.spyOn(
                    sessionsService,
                    'findActiveUserSessions'
                ).mockResolvedValue(queryResponse);

                await expect(
                    sessionsController['getSessions'](
                        authUser,
                        opts
                    )
                ).resolves.toStrictEqual({
                    type: 'success',
                    code: 'RESOURCES_FETCHED',
                    details: queryResponse
                });

                expect(sessionsService.findActiveUserSessions)
                    .toHaveBeenCalledWith(
                        authUser.userId,
                        opts
                    );
            }
        );
    });

    describe('deleteSessions', () => {
        it(
            'should delete a list of entity ids',
            async () =>
            {
                const entitiesToDelete = {
                    ids: [ 1, 2, 3, 4 ]
                };

                const deletedEntities = [
                    1, 3, 4
                ];

                jest.spyOn(
                    sessionsService,
                    'deleteMany'
                ).mockResolvedValue(deletedEntities);

                await expect(
                    sessionsController['deleteSessions'](
                        authUser,
                        entitiesToDelete
                    )
                ).resolves.toStrictEqual({
                    type: 'success',
                    code: 'RESOURCES_DELETED',
                    details: {
                        session_ids: deletedEntities
                    }
                });

                expect(sessionsService.deleteMany)
                    .toHaveBeenCalledWith(
                        authUser.userId,
                        entitiesToDelete
                    );
            }
        );
    });

    describe('getSession', () => {
        it(
            'should return a single session by id',
            async () => {
                const session = {
                    id: 1,
                    userId: 1,
                    ipAddress: '127.0.0.1',
                    UserAgent: 'test-agent'
                } as any as Session;

                jest.spyOn(
                    sessionsService,
                    'findByAuthUser'
                ).mockResolvedValue(session);

                await expect(
                    sessionsController['getSession'](
                        authUser,
                        authContext,
                        1
                    )
                ).resolves.toStrictEqual({
                    type: 'success',
                    code: 'RESOURCE_FETCHED',
                    details: session
                });

                expect(sessionsService.findByAuthUser)
                    .toHaveBeenCalledWith(
                        {
                            userId: 1,
                            sessionId: 1
                        },
                        authContext
                    );
            }
        );
    });

    describe('deleteSession', () => {
        it(
            'should delete a single session by id',
            async () => {
                jest.spyOn(
                    sessionsService,
                    'deleteOne'
                );

                await expect(
                    sessionsController['deleteSession'](
                        authUser,
                        1
                    )
                ).resolves.toStrictEqual({
                    type: 'success',
                    code: 'RESOURCE_DELETED',
                    details: {}
                });

                expect(sessionsService.deleteOne)
                    .toHaveBeenCalledWith(
                        authUser.userId,
                        1
                    );
            }
        );
    });
});
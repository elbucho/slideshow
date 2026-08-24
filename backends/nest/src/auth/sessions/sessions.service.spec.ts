import { Repository } from 'typeorm';
import { Session } from '@/database/entities/session.entity';
import { CreateSessionDto } from './dtos/create-session.dto';
import { ResourceNotFoundException } from '@/common/exceptions';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
    let sessionsService: SessionsService;
    let sessions: jest.Mocked<Repository<Session>>;

    beforeAll(() => {
        sessions = {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn()
        } as any as jest.Mocked<Repository<Session>>;

        sessionsService = new SessionsService(sessions);
    });

    describe('findById', () => {
        it('should return a session if the provided ID exists in the db', () => {
            const session = {
                id: 1
            } as any as Session;

            sessions.findOne.mockResolvedValue(session);

            expect(
                sessionsService.findById(1)
            ).resolves.toStrictEqual(
                session
            );
        });

        it('should throw a ResourceNotFoundException if the id doesn\'t exist', () => {
            sessions.findOne.mockResolvedValue(null);

            expect(
                sessionsService.findById(1)
            ).rejects.toThrow(
                new ResourceNotFoundException(
                    'session',
                    'id',
                    1
                )
            );
        });
    });

    describe('findByUserId', () => {
        it('should return all sessions associated with a given user id', () => {
            const session = {
                id: 1
            } as any as Session;

            sessions.find.mockResolvedValue([session]);

            expect(
                sessionsService.findByUserId(1)
            ).resolves.toStrictEqual(
                [ session ]
            );
        });
    });

    describe('getOrCreateSession', () => {
        const dto = {
            userId: 1,
            userAgent: 'test-user-agent',
            ipAddress: '127.0.0.1'
        } as CreateSessionDto;

        const session = {
            id: 1,
            userId: 1
        } as any as Session;

        it('should return a session if one exists in the db', () => {
            sessions.findOneBy.mockResolvedValue(session);

            expect(
                sessionsService.getOrCreateSession(dto)
            ).resolves.toStrictEqual(
                session
            );
        });

        it('should create a session if one matching the dto doesn\'t exist', async () => {
            sessions.findOneBy.mockResolvedValue(null);
            sessions.create.mockReturnValue(session);
            sessions.save.mockResolvedValue(session);

            await expect(
                sessionsService.getOrCreateSession(dto)
            ).resolves.toStrictEqual(
                session
            );

            expect(sessions.create).toHaveBeenCalledWith(dto);
            expect(sessions.save).toHaveBeenCalledWith(session);
        });
    });

    describe('saveSession', () => {
        it('should save the passed session to the db', async () => {
            const session = {} as any as Session;

            await sessionsService.saveSession(session);

            expect(sessions.save).toHaveBeenCalledWith(session);
        });
    });

    describe('deleteSession', () => {
        it('should soft-delete the passed session', async () => {
            const session = {} as any as Session;

            await sessionsService.deleteSession(session);

            expect(sessions.softRemove).toHaveBeenCalledWith(session);
        });
    });
});
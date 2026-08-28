import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { Session } from '@/database/entities/session.entity';
import { CreateSessionDto } from './dtos/create-session.dto';
import { User } from '@/database/entities/user.entity';
import { CryptService } from '@/crypt/crypt.service';
import {
    AuthEvents,
    SessionLimitExceededEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent,
    TokenMismatchEvent,
    UnknownServerErrorEvent,
    UserLoggedOutEvent
} from '@/events/auth.events';
import {
    ResourceNotFoundException,
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import { QueryResponse } from '@/common/types';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';
import { applyQueryOptions, filterOptions } from
        '@/database/filters/query-options.filter';
import { BulkEntitiesDto } from '@/common/dtos/bulk-entities.dto';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(Session)
        private readonly sessions: Repository<Session>,
        private readonly cryptService: CryptService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async findById(
        id: number,
        includeUser: boolean = false
    ): Promise<Session> {
        let relations: Record<string, unknown> = {};

        if (includeUser) {
            relations['user'] = {
                states: {
                    state: true
                }
            };
        }

        const session = await this.sessions.findOne({
            where: { id: id },
            relations
        });

        if (!session) {
            throw new ResourceNotFoundException(
                'session',
                'id',
                id
            );
        }

        return session;
    }

    async findMany(
        userId: number,
        opts: QueryOptions
    ): Promise<QueryResponse<Session>> {
        const qb =
            this.sessions.createQueryBuilder(
                'session'
            );

        qb.where(
            'session.user_id = :userId',
            { userId }
        );

        opts = filterOptions(
            opts,
            {
                includeFields: [
                    'page', 'pageSize', 'sort'
                ]
            }
        );

        applyQueryOptions(
            qb,
            opts,
            'session'
        );

        const [ items, total ] =
            await qb.getManyAndCount();

        return {
            items,
            total,
            page: opts.page,
            pageSize: opts.pageSize
        }
    }

    async findOne(
        userId: number,
        sessionId: number
    ): Promise<Session> {
        const session =
            await this.sessions.findOneBy({
                id: sessionId,
                userId
            });

        if (!session) {
            throw new ResourceNotFoundException(
                'session',
                'id',
                sessionId
            );
        }

        return session;
    }

    async findActiveUserSessions(
        user: User
    ): Promise<Session[]> {
        return this.sessions.findBy({
            userId: user.id
        });
    }

    async findCurrentUserSession(
        user: User,
        context: AuthContext
    ): Promise<Session|null> {
        return this.sessions.findOne({
            where: {
                userId: user.id,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent
            },
            relations: {
                user: true
            }
        });
    }

    async checkIfSessionLimitExceeded(
        user: User,
        context: AuthContext
    ): Promise<boolean> {
        const activeSessions =
            await this.getActiveSessionCount(
                user
            );

        const maxSessions = this.configService.get(
            'users.maxActiveSessions'
        );

        if (activeSessions >= maxSessions) {
            this.eventEmitter.emitAsync(
                AuthEvents.SESSION_LIMIT_EXCEEDED,
                new SessionLimitExceededEvent(
                    user.id,
                    context.ipAddress,
                    context.userAgent,
                    activeSessions,
                    maxSessions
                )
            ).then();

            return true;
        }

        return false;
     }

    async getActiveSessionCount(
        user: User
    ): Promise<number> {
        return this.sessions.countBy({
            userId: user.id
        });
    }

    async getOrCreateSession(
        sessionDto: CreateSessionDto
    ): Promise<Session> {
        let session =
            await this.sessions.findOneBy(sessionDto);

        if (!session) {
            session = this.sessions.create(sessionDto);
            session = await this.sessions.save(session);
        }

        return session;
    }

    async setToken(
        session: Session,
        token: string,
        timeout: Date
    ): Promise<Session> {
        const tokenHash =
            await this.cryptService.hash(token);

        session.setHashedToken(tokenHash);
        session.tokenExpiresAt = timeout;

        return this.save(session);
    }

    async verifyTokenMatches(
        session: Session,
        token: string,
        context: AuthContext
    ): Promise<void> {
        const hash = session.getHashedToken();
        const verified = hash
            ? await this.cryptService.verify(
                hash,
                token
            )
            : false;

        if (!verified) {
            await this.eventEmitter.emitAsync(
                AuthEvents.TOKEN_SESSION_MISMATCH,
                new TokenMismatchEvent(
                    session.id,
                    session.userId,
                    context.ipAddress,
                    context.userAgent
                )
            );

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }
    }

    async verifyNotExpired(
        session: Session,
        context: AuthContext
    ): Promise<void> {
        if (
            session.tokenExpiresAt &&
            session.tokenExpiresAt < new Date()
        ) {
            this.eventEmitter.emitAsync(
                AuthEvents.SESSION_TOKEN_EXPIRED,
                new SessionTokenExpiredEvent(
                    'refresh',
                    session.id,
                    session.userId,
                    session.tokenExpiresAt,
                    context.ipAddress,
                    context.userAgent
                )
            ).then();

            throw new SessionExpiredException(
                'Session expired',
                {
                    'token_expired_at':
                    session.tokenExpiresAt
                }
            );
        }
    }

    async create(
        user: User,
        context: AuthContext
    ): Promise<Session> {
        let session = new Session();

        session.userId = user.id;
        session.ipAddress = context.ipAddress;
        session.userAgent = context.userAgent;

        return this.save(session);
    }

    async terminate(
        { userId, sessionId }: AuthUser,
        context: AuthContext
    ) {
        let session: Session;

        try {
            session = await this.findById(sessionId);
        } catch (err: unknown) {
            if (err instanceof ResourceNotFoundException) {
                this.eventEmitter.emitAsync(
                    AuthEvents.SESSION_NOT_FOUND,
                    new SessionNotFoundEvent(
                        userId,
                        sessionId,
                        context.ipAddress,
                        context.userAgent
                    )
                ).then();

                throw new SessionNotFoundException(
                    'Invalid token'
                );
            }

            const identifier =
                `User id: ${userId}, ` +
                `Session id: ${sessionId}`;

            this.eventEmitter.emitAsync(
                AuthEvents.UNKNOWN_SERVER_ERROR,
                new UnknownServerErrorEvent(
                    identifier,
                    context.ipAddress,
                    err
                )
            ).then();

            throw err;
        }

        this.eventEmitter.emitAsync(
            AuthEvents.LOGGED_OUT,
            new UserLoggedOutEvent(
                session.userId,
                session.id
            )
        ).then();

        await this.delete(session);
    }

    async save(session: Session): Promise<Session> {
        return this.sessions.save(session);
    }

    async delete(session: Session): Promise<void> {
        await this.sessions.softRemove(session);
    }

    async deleteOne(
        userId: number,
        sessionId: number
    ): Promise<void> {
        await this.sessions.softDelete({
            id: sessionId,
            userId
        });
    }

    async deleteMany(
        userId: number,
        { ids }: BulkEntitiesDto
    ): Promise<number[]> {
        const existing =
            await this.sessions.find({
                where: {
                    id: In(ids),
                    userId
                },
                select: { id: true }
            }) as Pick<Session, 'id'>[];

        const foundIds = existing.map(
            (e) => e.id
        );

        if (foundIds.length === 0) return [];

        await this.sessions.softDelete(
            foundIds
        );

        return foundIds;
    }
}
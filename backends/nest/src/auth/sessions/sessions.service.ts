import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthContext } from
        '@/auth/decorators/auth-context.decorator';
import { AuthUser } from
        '@/auth/decorators/auth-user.decorator';
import { Session } from '@/database/entities/session.entity';
import { CryptService } from '@/crypt/crypt.service';
import {
    AuthEvents,
    SessionLimitReachedEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent,
    SessionsDeletedEvent,
    TokenMismatchEvent,
    UserLoggedOutEvent
} from '@/events/auth.events';
import {
    InvalidCredentialsException,
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import { BulkEntitiesDto } from '@/common/dtos/bulk-entities.dto';
import { AbstractService } from '@/common/abstract.service';
import { PaginatedResponse } from '@/common/types';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';

@Injectable()
export class SessionsService extends AbstractService<Session> {
    constructor(
        @InjectRepository(Session)
        repository: Repository<Session>,

        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly cryptService: CryptService,
    ) {
        super(repository);
    }

    private addCurrent(
        sessions: Session[],
        sessionId?: number
    ): void {
        sessions.map(
            (session) =>
                session.current = session.id === sessionId
        );
    }

    async markLastActive(
        session: Session
    ): Promise<Session> {
        session.lastActiveAt = new Date();

        return this.save(session);
    }

    async findActiveUserSessions(
        authUser: AuthUser,
        opts?: QueryOptions
    ): Promise<PaginatedResponse<Session>> {
        const response =
            await this.findManyWithCount(
                {
                    where: 'session.user_id = :userId',
                    params: {
                        userId: authUser.userId
                    }
                },
                opts
            );

        this.addCurrent(
            response.items,
            authUser.sessionId
        );

        return this.addPagination(response)
    }

    async findCurrentUserSession(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<Session|null> {
        const where = authUser.sessionId
            ? 'session.user_id = :userId AND session.id = :sessionId'
            : 'session.user_id = :userId AND ' +
                'session.user_agent = :userAgent AND ' +
                'session.ip_address = :ipAddress';

        const params = authUser.sessionId
            ? authUser
            : { ...authUser, ...context };

        const session = await this.findOne(
            { where, params },
            {
                expand: [ 'user' ]
            }
        );

        if (session) session.current = true;

        return session;
    }

    async findByAuthUser(
        authUser: AuthUser,
        context: AuthContext,
        includeUser: boolean = false
    ): Promise<Session> {
        let session: Session | null = null;

        if (authUser.sessionId) {
            session = await this.findOne(
                {
                    where: 'session.user_id = :userId AND ' +
                        'session.id = :sessionId',
                    params: authUser
                },
                {
                    expand: includeUser
                        ? [ 'user.states.state' ]
                        : undefined
                }
            );
        }

        if (!session) {
            await this.eventEmitter.emitAsync(
                AuthEvents.SESSION_NOT_FOUND,
                new SessionNotFoundEvent(
                    authUser.userId,
                    authUser.sessionId ?? 0,
                    context.ipAddress,
                    context.userAgent
                )
            );

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }

        session.current = true;

        return session;
    }

    async checkIfSessionLimitReached(
        userId: number,
        activeSessions: number,
        context: AuthContext
    ): Promise<boolean> {
        const maxSessions = this.configService.get(
            'users.maxActiveSessions'
        );

        if (activeSessions >= maxSessions) {
            await this.eventEmitter.emitAsync(
                AuthEvents.SESSION_LIMIT_REACHED,
                new SessionLimitReachedEvent(
                    userId,
                    context.ipAddress,
                    context.userAgent,
                    activeSessions,
                    maxSessions
                )
            );

            return true;
        }

        return false;
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
            await this.eventEmitter.emitAsync(
                AuthEvents.SESSION_TOKEN_EXPIRED,
                new SessionTokenExpiredEvent(
                    'refresh',
                    session.id,
                    session.userId,
                    session.tokenExpiresAt,
                    context.ipAddress,
                    context.userAgent
                )
            );

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
        userId: number,
        context: AuthContext
    ): Promise<Session> {
        const session = new Session();

        session.userId = userId;
        session.ipAddress = context.ipAddress;
        session.userAgent = context.userAgent;
        session.lastActiveAt = new Date();

        return this.save(session);
    }

    async terminate(
        authUser: AuthUser,
        context: AuthContext
    ): Promise<boolean> {
        if (!authUser.sessionId) {
            throw new InvalidCredentialsException(
                'Invalid token'
            );
        }

        const session =
            await this.findByAuthUser(
                authUser,
                context
            );

        await this.eventEmitter.emitAsync(
            AuthEvents.LOGGED_OUT,
            new UserLoggedOutEvent(
                session.userId,
                session.id
            )
        );

        return this.delete(session);
    }

    async deleteOne(
        userId: number,
        sessionId: number
    ): Promise<boolean> {
        const success =
            await this.deleteWhere({
                where: 'session.user_id = :userId ' +
                    'AND session.id = :sessionId',
                params: {
                    userId,
                    sessionId
                }
            });

        if (success) {
            await this.eventEmitter.emitAsync(
                AuthEvents.SESSIONS_DELETED,
                new SessionsDeletedEvent(
                    userId,
                    [ sessionId ]
                )
            );

            return true;
        }

        return false;
    }

    async deleteMany(
        userId: number,
        { ids }: BulkEntitiesDto
    ): Promise<number[]> {
        const deleteResults =
            await this.bulkDelete({
                where: 'session.user_id = :userId ' +
                    'AND session.id IN (:...ids)',
                params: {
                    userId,
                    ids
                }
            });

        if (deleteResults.deletedIds.length >= 1) {
            await this.eventEmitter.emitAsync(
                AuthEvents.SESSIONS_DELETED,
                new SessionsDeletedEvent(
                    userId,
                    deleteResults.deletedIds
                )
            );
        }

        return deleteResults.deletedIds;
    }
}
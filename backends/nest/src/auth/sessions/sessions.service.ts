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
import { CryptService } from '@/crypt/crypt.service';
import {
    AuthEvents,
    SessionLimitExceededEvent,
    SessionNotFoundEvent,
    SessionTokenExpiredEvent,
    TokenMismatchEvent,
    UserLoggedOutEvent
} from '@/events/auth.events';
import {
    SessionExpiredException,
    SessionNotFoundException
} from '@/common/exceptions';
import { BulkEntitiesDto } from '@/common/dtos/bulk-entities.dto';
import { AbstractService } from '@/common/abstract.service';
import { QueryResponse } from '@/common/types';
import { QueryOptions } from
        '@/database/decorators/query-options.decorator';

@Injectable()
export class SessionsService extends AbstractService<Session> {
    constructor(
        configService: ConfigService,
        eventEmitter: EventEmitter2,
        private readonly cryptService: CryptService,

        @InjectRepository(Session)
        repository: Repository<Session>,
    ) {
        super(
            configService,
            eventEmitter,
            repository
        );
    }

    async findActiveUserSessions(
        userId: number,
        opts?: QueryOptions
    ): Promise<QueryResponse<Session>> {
        return this.findManyWithCount(
            {
                where: 'session.user_id = :userId',
                params: { userId }
            },
            opts
        );
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

        return this.findOne(
            { where, params },
            {
                expand: [ 'user' ]
            }
        );
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
                    where: 'session.user_id = :userId AND session.id = :sessionId',
                    params: authUser
                },
                {
                    expand: includeUser ? [ 'user' ] : undefined
                }
            );
        }

        if (!session) {
            this.eventEmitter.emitAsync(
                AuthEvents.SESSION_NOT_FOUND,
                new SessionNotFoundEvent(
                    authUser.userId,
                    authUser.sessionId ?? 0,
                    context.ipAddress,
                    context.userAgent
                )
            ).then();

            throw new SessionNotFoundException(
                'Invalid token'
            );
        }

        return session;
    }

    async checkIfSessionLimitExceeded(
        userId: number,
        activeSessions: number,
        context: AuthContext
    ): Promise<boolean> {
        const maxSessions = this.configService.get(
            'users.maxActiveSessions'
        );

        if (activeSessions >= maxSessions) {
            this.eventEmitter.emitAsync(
                AuthEvents.SESSION_LIMIT_EXCEEDED,
                new SessionLimitExceededEvent(
                    userId,
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

    async createSession(
        userId: number,
        context: AuthContext
    ): Promise<Session> {
        let session = new Session();

        session.userId = userId;
        session.ipAddress = context.ipAddress;
        session.userAgent = context.userAgent;

        return this.save(session);
    }

    async terminate(
        authUser: AuthUser,
        context: AuthContext
    ) {
        if (!authUser.sessionId) {
            return;
        }

        const session =
            await this.findByAuthUser(
                authUser,
                context
            );

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
        return this.repository.save(session);
    }

    async delete(session: Session): Promise<void> {
        await this.repository.softRemove(session);
    }

    async deleteOne(
        userId: number,
        sessionId: number
    ): Promise<void> {
        await this.repository.softDelete({
            id: sessionId,
            userId
        });
    }

    async deleteMany(
        userId: number,
        { ids }: BulkEntitiesDto
    ): Promise<number[]> {
        const existing =
            await this.repository.find({
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

        await this.repository.softDelete(
            foundIds
        );

        return foundIds;
    }

    async create(
        userId: number,
        context: AuthContext
    ): Promise<Session> {
        const session = new Session();

        session.userId = userId;
        session.ipAddress = context.ipAddress;
        session.userAgent = context.userAgent;

        return this.save(session);
    }
}
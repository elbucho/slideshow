import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { OutboxEvent } from '@/database/entities/outbox-event.entity';
import { OutboxEventStatus } from './outbox.types';
import {
    UserEmailUpdatedEvent,
    UserEvents
} from '@/events/user.events';
import {
    OutboxEvents,
    UnknownOutboxEventType
} from '@/events/outbox.events';

interface NextTryDateType {
    maxAttemptsReached: boolean;
    availableAt: Date | null;
}

@Injectable()
export class OutboxService {
    private readonly workerId = randomUUID();

    constructor(
        @InjectRepository(OutboxEvent)
        private readonly repository: Repository<OutboxEvent>,
        private readonly dataSource: DataSource,
        private readonly eventEmitter: EventEmitter2,
        private readonly configService: ConfigService
    ) {}

    @Cron('30 * * * * *')
    async processPendingEvents(): Promise<void> {
        const events = await this.getPendingEvents();

        for (const event of events) {
            await this.dispatchEvent(event);
        }
    }

    private async getPendingEvents(): Promise<OutboxEvent[]> {
        let events: OutboxEvent[] = [];

        return this.dataSource.transaction(async manager => {
            events = await manager
                .getRepository(OutboxEvent)
                .createQueryBuilder('event')
                .where(
                    'event.status = :status',
                    { status: OutboxEventStatus.PENDING }
                )
                .andWhere(
                    'event.available_at <= :now',
                    { now: new Date() }
                )
                .orderBy('event.created_at', 'ASC')
                .limit(10)
                .setLock('pessimistic_write')
                .setOnLocked('skip_locked')
                .getMany();

            for (const event of events) {
                event.status = OutboxEventStatus.PROCESSING;
                event.attempts = event.attempts
                    ? event.attempts + 1
                    : 1;
                event.lockedAt = new Date();
                event.lockedBy = this.workerId;
            }

            return manager.save(events);
        });
    }

    private async dispatchEvent(
        event: OutboxEvent
    ): Promise<void> {
        switch(event.type) {
            case UserEvents.EMAIL_UPDATED:
                const userId = Number(event.payload?.userId ?? 0);

                await this.eventEmitter.emitAsync(
                    UserEvents.EMAIL_UPDATED,
                    new UserEmailUpdatedEvent(
                        event.id,
                        userId
                    )
                );

                break;
            default:
                await this.eventEmitter.emitAsync(
                    OutboxEvents.UNKNOWN_EVENT_TYPE,
                    new UnknownOutboxEventType(
                        event.type,
                        new Date()
                    )
                );

                event.lastError = 'Unknown event type';
                event.status = OutboxEventStatus.DEAD_LETTER;

                await this.repository.save(event);

                break;
        }
    }

    private getNextTryDate(attempts: number): NextTryDateType {
        const maxAttempts = this.configService.get('outbox.maxAttempts');

        if (attempts >= maxAttempts) {
            return {
                maxAttemptsReached: true,
                availableAt: null
            };
        }

        const baseDelay = this.configService.get('outbox.baseDelay');
        const maxDelay = this.configService.get('outbox.maxDelay');
        const maxJitter = this.configService.get('outbox.maxJitter');

        const delay = Math.min(
            baseDelay * 2 ** attempts,
            maxDelay
        );

        const jitter = Math.random() * maxJitter;
        const availableAt = new Date(Date.now() + delay + jitter);

        return {
            maxAttemptsReached: false,
            availableAt
        };
    }

    async create(
        type: string,
        payload: Record<string, any>,
        manager?: EntityManager
    ): Promise<OutboxEvent> {
        const repository = manager
            ? manager.getRepository(OutboxEvent)
            : this.repository;

        const event = new OutboxEvent();
        event.status = OutboxEventStatus.PENDING;
        event.payload = payload;
        event.type = type;

        return repository.save(event);
    }

    async complete(eventId: string): Promise<void> {
        const event = await this.repository
            .findOneBy({ id: eventId });

        if (event) {
            event.lockedAt = null;
            event.lockedBy = null;
            event.processedAt = new Date();
            event.status = OutboxEventStatus.COMPLETED;

            await this.repository.save(event);
        }
    }

    async fail(
        eventId: string,
        error: string,
        fatal?: boolean
    ): Promise<void> {
        const event = await this.repository
            .findOneBy({ id: eventId });

        if (!event) return;

        event.lockedAt = null;
        event.lockedBy = null;
        event.lastError = error;

        const { maxAttemptsReached, availableAt } =
            this.getNextTryDate(event.attempts);

        event.status = (fatal || maxAttemptsReached)
            ? OutboxEventStatus.DEAD_LETTER
            : OutboxEventStatus.PENDING;

        event.availableAt = availableAt;

        await this.repository.save(event);
    }
}
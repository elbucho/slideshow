import { Repository, DataSource, QueryBuilder, EntityManager} from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxService } from './outbox.service';
import { OutboxEvent } from
        '@/database/entities/outbox-event.entity';
import {
    UserEmailUpdatedEvent,
    UserEvents
} from '@/events/user.events';
import {
    UnknownOutboxEventType,
    OutboxEvents
} from '@/events/outbox.events';
import {OutboxEventStatus} from "@/outbox/outbox.types";

describe('OutboxService', () => {
    let repository: Repository<OutboxEvent>;
    let dataSource: DataSource;
    let queryBuilder: QueryBuilder<OutboxEvent>;
    let entityManager: EntityManager;
    let eventEmitter: EventEmitter2;
    let configService: ConfigService;
    let outboxService: OutboxService;

    const getMany = jest.fn();

    beforeAll(() => {
        queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            setOnLocked: jest.fn().mockReturnThis(),
            getMany
        } as any as QueryBuilder<OutboxEvent>;

        repository = {
            save: jest.fn(
                (entity) => entity
            ),
            createQueryBuilder: jest.fn()
                .mockReturnValue(queryBuilder),
            findOneBy: jest.fn()
        } as any as Repository<OutboxEvent>;

        entityManager = {
            getRepository: jest.fn()
                .mockReturnValue(repository),
            save: jest.fn(
                (entities) => entities
            )
        } as any as EntityManager;

        dataSource = {
            transaction: jest.fn(
                async cb => cb(entityManager)
            )
        } as any as DataSource;

        eventEmitter = {
            emitAsync: jest.fn()
        } as any as EventEmitter2;

        configService = {
            get: jest.fn()
        } as any as ConfigService;

        outboxService = new OutboxService(
            repository,
            dataSource,
            eventEmitter,
            configService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('processPendingEvents', () => {
        it(
            'should grab an array of pending events from ' +
            'the outbox_events table',
            async () => {
                const service = outboxService as unknown as {
                    dispatchEvent: jest.Mock
                };

                jest.spyOn(
                    service,
                    'dispatchEvent'
                ).mockResolvedValueOnce(true);

                const events = [
                    new OutboxEvent(),
                    new OutboxEvent(),
                    new OutboxEvent(),
                    { attempts: 2 } as any as OutboxEvent
                ];

                getMany.mockResolvedValueOnce(events);

                await outboxService.processPendingEvents();

                expect(entityManager.save)
                    .toHaveBeenCalledTimes(1);

                expect(service.dispatchEvent)
                    .toHaveBeenCalledTimes(4);
            }
        );

        it(
            'should dispatch email_updated events',
            async () => {
                const events = [
                    {
                        id: 'asdf-1234',
                        type: UserEvents.EMAIL_UPDATED,
                        payload: {
                            userId: 1
                        }
                    } as any as OutboxEvent
                ];

                const service = outboxService as unknown as {
                    getPendingEvents: jest.Mock
                };

                jest.spyOn(
                    service,
                    'getPendingEvents'
                ).mockResolvedValueOnce(events);

                await outboxService.processPendingEvents();

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        UserEvents.EMAIL_UPDATED,
                        new UserEmailUpdatedEvent(
                            'asdf-1234',
                            1
                        )
                    );
            }
        );

        it(
            'should set the userId to 0 if the payload ' +
            'is missing the userId field',
            async () => {
                const events = [
                    {
                        id: 'asdf-1234',
                        type: UserEvents.EMAIL_UPDATED,
                        payload: {}
                    } as any as OutboxEvent
                ];

                const service = outboxService as unknown as {
                    getPendingEvents: jest.Mock
                };

                jest.spyOn(
                    service,
                    'getPendingEvents'
                ).mockResolvedValueOnce(events);

                await outboxService.processPendingEvents();

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        UserEvents.EMAIL_UPDATED,
                        new UserEmailUpdatedEvent(
                            'asdf-1234',
                            0
                        )
                    );

            }
        );

        it(
            'should emit an UNKNOWN_EVENT_TYPE event ' +
            'if the OutboxEvent type is invalid',
            async () => {
                const events = [
                    {
                        type: 'Invalid',
                    } as any as OutboxEvent
                ];

                const service = outboxService as unknown as {
                    getPendingEvents: jest.Mock
                };

                jest.spyOn(
                    service,
                    'getPendingEvents'
                ).mockResolvedValueOnce(events);

                await outboxService.processPendingEvents();

                expect(eventEmitter.emitAsync)
                    .toHaveBeenCalledWith(
                        OutboxEvents.UNKNOWN_EVENT_TYPE,
                        new UnknownOutboxEventType(
                            'Invalid',
                            expect.any(Date)
                        )
                    );

                expect(repository.save)
                    .toHaveBeenCalledTimes(1);
            }
        );
    });

    describe('create', () => {
        it(
            'should create a new OutboxEvent entity and save it to ' +
            'the database',
            async () => {
                const event = await outboxService.create(
                    'test',
                    {
                        foo: 'bar'
                    }
                );

                expect(event.status).toEqual(OutboxEventStatus.PENDING);
                expect(event.payload).toEqual({
                    foo: 'bar'
                });
                expect(event.type).toEqual('test');

                expect(repository.save)
                    .toHaveBeenCalledTimes(1);
            }
        );

        it(
            'should use the provided entityManager to save ' +
            'the entity to preserve transaction integrity',
            async () => {
                const event = await outboxService.create(
                    'test',
                    {
                        foo: 'bar'
                    },
                    entityManager
                );

                expect(event.status).toEqual(OutboxEventStatus.PENDING);
                expect(event.payload).toEqual({
                    foo: 'bar'
                });
                expect(event.type).toEqual('test');

                expect(entityManager.getRepository)
                    .toHaveBeenCalledTimes(1);

                expect(repository.save)
                    .toHaveBeenCalledTimes(1);
            }
        );
    });

    describe('complete', () => {
        it(
            'should exit early if no events matching the ' +
            'provided id are located',
            async () => {
                jest.spyOn(
                    repository,
                    'findOneBy'
                ).mockResolvedValueOnce(null);

                await outboxService.complete('asdf-1234');

                expect(repository.findOneBy)
                    .toHaveBeenCalledWith({ id: 'asdf-1234' });

                expect(repository.save)
                    .not.toHaveBeenCalled();
            }
        );

        it(
            'should reset the lockedAt and lockedBy fields, ' +
            'set processedAt to now, and set the status to ' +
            'OutboxEventStatus.COMPLETED',
            async () => {
                const event = new OutboxEvent();
                event.id = 'asdf-1234';
                event.status = OutboxEventStatus.PENDING;

                jest.spyOn(
                    repository,
                    'findOneBy'
                ).mockResolvedValueOnce(event);

                await outboxService
                    .complete('asdf-1234');

                expect(repository.save)
                    .toHaveBeenCalledWith({
                        ...event,
                        lockedAt: null,
                        lockedBy: null,
                        processedAt: expect.any(Date),
                        status: OutboxEventStatus.COMPLETED
                    });
            }
        );
    });

    describe('fail', () => {
        it(
            'should return early if no matching event ' +
            'is found in the database',
            async () => {
                jest.spyOn(
                    repository,
                    'findOneBy'
                ).mockResolvedValueOnce(null);

                await outboxService.fail(
                    'asdf-1234',
                    'Test error'
                );

                expect(repository.findOneBy)
                    .toHaveBeenCalledWith({ id: 'asdf-1234' });

                expect(repository.save)
                    .not.toHaveBeenCalled();
            }
        );

        it(
            'should set the event status to ' +
            'OutboxEventStatus.DEAD_LETTER if fatal = true',
            async () => {
                jest.spyOn(
                    repository,
                    'findOneBy'
                ).mockResolvedValueOnce(
                    {} as any as OutboxEvent
                );

                const service = outboxService as unknown as {
                    getNextTryDate: jest.Mock
                };

                jest.spyOn(
                    service,
                    'getNextTryDate'
                ).mockReturnValueOnce({
                    maxAttemptsReached: false,
                    availableAt: null
                });

                await outboxService.fail(
                    'asdf-1234',
                    'Test error',
                    true
                );

                expect(repository.save)
                    .toHaveBeenCalledWith({
                        lockedAt: null,
                        lockedBy: null,
                        lastError: 'Test error',
                        status: OutboxEventStatus.DEAD_LETTER,
                        availableAt: null
                    });
            }
        );

        it(
            'should set the event status to ' +
            'OutboxEventStatus.DEAD_LETTER if the maximum ' +
            'number of attempts has been reached',
            async () => {
                jest.spyOn(
                    configService,
                    'get'
                ).mockReturnValueOnce(5);

                jest.spyOn(
                    repository,
                    'findOneBy'
                ).mockResolvedValueOnce(
                    { attempts: 5 } as any as OutboxEvent
                );

                await outboxService.fail(
                    'asdf-1234',
                    'Test error'
                );

                expect(repository.save)
                    .toHaveBeenCalledWith({
                        lockedAt: null,
                        lockedBy: null,
                        lastError: 'Test error',
                        attempts: 5,
                        status: OutboxEventStatus.DEAD_LETTER,
                        availableAt: null
                    });

            }
        );

        it(
            'should set the event status to ' +
            'OutboxEventStatus.PENDING if the maximum ' +
            'number of attempts has not been reached',
            async () => {
                jest.spyOn(
                    configService,
                    'get'
                ).mockReturnValueOnce(5)
                    .mockReturnValueOnce(10000)
                    .mockReturnValueOnce(3600000)
                    .mockReturnValueOnce(5000);

                jest.spyOn(
                    repository,
                    'findOneBy'
                ).mockResolvedValueOnce(
                    { attempts: 2 } as any as OutboxEvent
                );

                await outboxService.fail(
                    'asdf-1234',
                    'Test error'
                );

                expect(repository.save)
                    .toHaveBeenCalledWith({
                        lockedAt: null,
                        lockedBy: null,
                        lastError: 'Test error',
                        attempts: 2,
                        status: OutboxEventStatus.PENDING,
                        availableAt: expect.any(Date)
                    });
            }
        );
    });
});
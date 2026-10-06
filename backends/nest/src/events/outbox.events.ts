export enum OutboxEvents {
    UNKNOWN_EVENT_TYPE = 'outbox.unknown_event_type'
}

export class UnknownOutboxEventType {
    constructor(
        public readonly type: string,
        public readonly processedAt: Date
    ) {}
}
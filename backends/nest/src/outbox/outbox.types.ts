export enum OutboxEventStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    DEAD_LETTER = 'dead_letter'
}
export enum UserEvents {
    EMAIL_UPDATED = 'user.email_updated',
    EMAIL_ACTIVATED = 'user.email_activated'
}

export class UserEmailUpdatedEvent {
    constructor(
        public readonly eventId: string,
        public readonly userId: number
    ) {}
}
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '@/users/users.service';
import {
    AuthEvents,
    SessionsDeletedEvent
} from '@/events/auth.events';
import { UserStateName } from
        '@/states/user-states.types';

@Injectable()
export class UserStateListener {
    constructor(
        private readonly usersService: UsersService
    ) {}

    @OnEvent(AuthEvents.SESSIONS_DELETED)
    async handleSessionsDeletedEvent(
        event: SessionsDeletedEvent
    ): Promise<void> {
        const user =
            await this.usersService.findById(
                event.userId,
                {
                    expand: [ 'states' ]
                }
            );

        if (user) {
            user.resolveState(
                UserStateName.SESSION_LIMIT_EXCEEDED
            );

            await this.usersService.save(
                user
            );
        }
    }
}

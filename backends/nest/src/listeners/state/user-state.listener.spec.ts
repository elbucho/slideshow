import { UsersService } from '@/users/users.service';
import { UserStateName } from '@/states/user-states.types';
import { UserStateListener } from './user-state.listener';
import { User } from '@/database/entities/user.entity';
import { SessionsDeletedEvent } from '@/events/auth.events';

describe('UserStateListener', () => {
    let listener: UserStateListener;
    let usersService: UsersService;

    beforeEach(() => {
        usersService = {
            findById: jest.fn(),
            save: jest.fn()
        } as any as jest.Mocked<UsersService>;

        listener = new UserStateListener(
            usersService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSessionsDeletedEvent', () => {
       it(
           'should find a user by the provided ID, then ' +
           'resolve all SESSION_LIMIT_REACHED states ' +
           'associated with it',
           async () => {
               const user = {
                   id: 1,
                   resolveState: jest.fn()
               } as any as User;

               jest.spyOn(
                   usersService,
                   'findById'
               ).mockResolvedValue(
                   user
               );

               jest.spyOn(
                   usersService,
                   'save'
               );

               await listener.handleSessionsDeletedEvent(
                   new SessionsDeletedEvent(
                       1,
                       [ 1 ]
                   )
               );

               expect(usersService.findById)
                   .toHaveBeenCalledWith(
                       1,
                       {
                           expand: [ 'states' ]
                       }
                   );

               expect(user.resolveState)
                   .toHaveBeenCalledWith(
                       UserStateName.SESSION_LIMIT_REACHED
                   );

               expect(usersService.save)
                   .toHaveBeenCalledWith(user);
           }
       );

       it(
           'should terminate early and do nothing if ' +
           'the userService can\'t find the user',
           async () => {
               jest.spyOn(
                   usersService,
                   'findById'
               ).mockResolvedValue(
                   null
               );

               await listener.handleSessionsDeletedEvent(
                   new SessionsDeletedEvent(
                       1,
                       [ 1 ]
                   )
               );

               expect(usersService.save)
                   .not.toHaveBeenCalled();
           }
       );
    });
});
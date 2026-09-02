import { User } from './user.entity';
import { UserState } from './user-state.entity';
import { State } from './state.entity';

describe('User', () => {
    let user: User;
    let userState1: UserState;
    let userState2: UserState;
    let userState3: UserState;
    let userState4: UserState;

    const isActive1 = jest.fn();
    const isActive2 = jest.fn();
    const isActive3 = jest.fn();
    const isActive4 = jest.fn();
    const resolve = jest.fn();

    beforeAll(() => {
        const state1 = {
            name: 'ACCOUNT_LOCKED',
        } as any as State;

        const state2 = {
            name: 'SESSION_LIMIT_EXCEEDED',
        } as any as State;

        userState1 = {
            state: state1,
            isActive: isActive1,
            resolve: resolve,
        } as any as UserState;

        userState2 = {
            state: state1,
            isActive: isActive2,
            resolve: resolve,
        } as any as UserState;

        userState3 = {
            state: state2,
            isActive: isActive3,
            resolve: resolve,
        } as any as UserState;

        userState4 = {
            state: state2,
            isActive: isActive4,
            resolve: resolve,
        } as any as UserState;

        user = new User();
        user.states = [
            userState1,
            userState2,
            userState3,
            userState4
        ];
    });

    describe('hasState', () => {
        it(
            'should return true if a state with the ' +
            'provided name exists in the states array, ' +
            'and that state is active',
            () => {
                isActive1.mockReturnValue(true);
                isActive2.mockReturnValue(false);
                isActive3.mockReturnValue(true);
                isActive4.mockReturnValue(true);

                expect(
                    user.hasState('ACCOUNT_LOCKED')
                ).toBe(true);

                expect(
                    user.hasState('SESSION_LIMIT_EXCEEDED')
                ).toBe(true);
            }
        );

        it(
            'should return false if no states match ' +
            'the provided name',
            () => {
                expect(
                    user.hasState('PENDING_ACTIVATION')
                ).toBe(false);
            }
        );

        it(
            'should return false if none of the states ' +
            'with that name are active',
            () => {
                isActive1.mockReturnValue(false);
                isActive2.mockReturnValue(false);

                expect(
                    user.hasState('ACCOUNT_LOCKED')
                ).toBe(false);
            }
        );
    });

    describe('getState', () => {
        it(
            'should return the first state that matches ' +
            'the provided name, and is active',
            () => {
                isActive3.mockReturnValue(true);
                isActive4.mockReturnValue(true);

                expect(
                    user.getState('SESSION_LIMIT_EXCEEDED')
                ).toBe(userState3);
            }
        );

        it(
            'should return undefined if no states with ' +
            'the provided name exist in the user states array',
            () => {
                expect(
                    user.getState('PENDING_ACTIVATION')
                ).toBe(undefined);
            }
        );

        it(
            'should return undefined if no states that match ' +
            'the provided name are active',
            () => {
                isActive1.mockReturnValue(false);
                isActive2.mockReturnValue(false);

                expect(
                    user.getState('ACCOUNT_LOCKED')
                ).toBe(undefined);
            }
        );
    });

    describe('setState', () => {
        it(
            'should push the provided userState into ' +
            'the states array, provided one with that ' +
            'name that is active doesn\'t currently exist',
            () => {
                const newState = {
                    state: {
                        name: 'PENDING_ACTIVATION'
                    },
                    isActive: () => true,
                    resolve: resolve
                } as any as UserState;

                user.setState(newState);

                expect(user.states.length).toBe(5);
            }
        );

        it(
            'should do nothing if another state exists ' +
            'in the states array that is active and shares ' +
            'the same name',
            () => {
                const newState = {
                    state: {
                        name: 'PENDING_ACTIVATION'
                    },
                    isActive: () => true
                } as any as UserState;

                expect(user.states.length).toBe(5);

                user.setState(newState);

                expect(user.states.length).toBe(5);
            }
        );
    });

    describe('resolveState', () => {
        it(
            'should resolve all states that match ' +
            'the provided name and are active',
            () => {
                user.resolveState('ACCOUNT_LOCKED');

                expect(resolve).toHaveBeenCalledTimes(2);

                resolve.mockClear();

                user.resolveState('PENDING_ACTIVATION');

                expect(resolve).toHaveBeenCalledTimes(1);
            }
        );
    });
});
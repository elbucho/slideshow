import { UserState } from './user-state.entity';

describe('UserState', () => {
    let userState: UserState;

    beforeEach(() => {
        userState = new UserState();

        userState.expiresAt = null;
        userState.resolvedAt = null;
        userState.data = null;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isActive', () => {
        it(
            'should return true if resolvedAt is null and ' +
            'expiresAt is null',
            () => {
                expect(
                    userState.isActive()
                ).toBe(true);
            }
        );

        it(
            'should return true if resolvedAt is null and ' +
            'expiresAt is in the future',
            () => {
                const now = new Date();
                userState.expiresAt = now;

                expect(
                    userState.isActive(new Date(
                        now.getTime() - 1000
                    ))
                ).toBe(true);
            }
        );

        it(
            'should return false if resolvedAt is not null',
            () => {
                userState.resolvedAt = new Date();

                expect(
                    userState.isActive()
                ).toBe(false);
            }
        );

        it(
            'should return false if resolvedAt is null, but ' +
            'expiresAt is some time in the past',
            () => {
                userState.resolvedAt = null;
                userState.expiresAt = new Date(
                    Date.now() - 1000
                );

                expect(
                    userState.isActive()
                ).toBe(false);
            }
        );
    });

    describe('resolve', () => {
        it(
            'should set resolvedAt to now if the ' +
            'UserState is currently active',
            () => {
                expect(
                    userState.isActive()
                ).toBe(true);

                userState.resolve();

                expect(
                    userState.isActive()
                ).toBe(false);
            }
        );

        it(
            'should do nothing if the UserState is ' +
            'currently inactive',
            () => {
                userState.resolvedAt = null;
                userState.expiresAt = new Date(
                    Date.now() - 1000
                );

                userState.resolve();

                expect(
                    userState.resolvedAt
                ).toBe(null);
            }
        );
    });

    describe('setHashedToken', () => {
        it(
            'should set the provided value into the ' +
            'data["tokenHash"] field',
            () => {
                userState.setHashedToken('test-hash');

                expect(
                    userState.data?.['tokenHash']
                ).toBe('test-hash');
            }
        );
    });

    describe('getHashedToken', () => {
        it(
            'should return null if no hashed token exists',
            () => {
                expect(
                    userState.getHashedToken()
                ).toBe(null);
            }
        );

        it(
            'should return a hashed token if one exists',
            () => {
                userState.data = {
                    tokenHash: 'test-hash'
                };

                expect(
                    userState.getHashedToken()
                ).toBe('test-hash');
            }
        );
    });
});
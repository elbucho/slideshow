import { Session } from './session.entity';

describe('Session', () => {
    describe('tokenHash', () => {
        it(
            'has a setter and getter',
            () => {
                const session = new Session();

                session.setHashedToken('test');

                expect(
                    session.getHashedToken()
                ).toEqual('test');
            }
        );

        it(
            'should return undefined for tokenHash if ' +
            'the setter hasn\'t been called yet',
            () => {
                const session = new Session();

                expect(
                    session.getHashedToken()
                ).toBe(undefined);
            }
        );
    });
});
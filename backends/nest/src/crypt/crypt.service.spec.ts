import argon2 from 'argon2';
import { CryptService } from './crypt.service';

jest.mock('argon2');

describe('CryptService', () => {
    let service: CryptService;

    beforeEach(() => {
        service = new CryptService();
    });

    describe('hash', () => {
        it(
            'should take in a payload and return ' +
            'a hashed version of it',
            async () => {
                jest.spyOn(
                    argon2,
                    'hash'
                ).mockResolvedValue('test-hash');

                await expect(
                    service.hash('test-payload')
                ).resolves.toBe('test-hash');
            }
        );
    });

    describe('verify', () => {
        it(
            'takes in a hashed value and a plain value ' +
            'and determines if the hashed value matches',
            async () => {
                jest.spyOn(
                    argon2,
                    'verify'
                ).mockResolvedValue(true);

                await expect(
                    service.verify(
                        'test-hash',
                        'test-plain'
                    )
                ).resolves.toBe(true);
            }
        );
    });
});
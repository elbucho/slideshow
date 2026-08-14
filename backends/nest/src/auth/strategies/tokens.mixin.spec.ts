import { Request } from 'express';
import { TokensMixin } from './tokens.mixin';
import type { TokenType } from '@/common/types';
import { InternalServerErrorException } from '@/common/exceptions';

describe('TokensMixin', () => {
    class Base {}
    const MixedBase = TokensMixin(Base);

    describe('extractToken', () => {
        it('should extract the token from the Authorization header', () => {
            for (const tokenType of ['access_token', 'refresh_token'] as TokenType[]) {
                const request = {
                    headers: {
                        authorization: `Bearer ${tokenType}`
                    },
                    cookies: {

                    }
                } as any as Request;

                expect(
                    MixedBase.extractToken(request, tokenType)
                ).toBe(tokenType);
            }
        });

        it('should extract the token from the cookie', () => {
            const request = {
                headers: {

                },
                cookies: {
                    access_token: 'access_token',
                    refresh_token: 'refresh_token'
                }
            } as any as Request;

            for (const tokenType of ['access_token', 'refresh_token'] as TokenType[]) {
                expect(
                    MixedBase.extractToken(request, tokenType)
                ).toBe(tokenType);
            }
        });

        it('should prioritize tokens in the Authorization header over cookies', () => {
            const request = {
                headers: {
                    authorization: 'Bearer header_token'
                },
                cookies: {
                    access_token: 'cookie_token'
                }
            } as any as Request;

            expect(
                MixedBase.extractToken(request, 'access_token')
            ).toBe('header_token');
        });
    });

    describe('getSecret', () => {
        it('should return the secret when it is set', () => {
            process.env.JWT_TEST_SECRET = 'test-secret';

            expect(
                MixedBase.getSecret('JWT_TEST_SECRET')
            ).toBe('test-secret');
        });

        it(
            'should throw an InternalServerErrorException if ' +
            'the process.env key is empty or not set',
            () => {
                for (const envKey of ['ACCESS', 'REFRESH']) {
                    delete process.env[`JWT_${envKey}_SECRET`];

                    expect(
                        () => MixedBase.getSecret(`JWT_${envKey}_SECRET`)
                    ).toThrow(
                        new InternalServerErrorException(
                            `JWT_${envKey}_SECRET is not set`
                        )
                    );
                }
            }
        );
    })
});

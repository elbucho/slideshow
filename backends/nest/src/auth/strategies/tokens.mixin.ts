import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { InternalServerErrorException } from '@/common/exceptions';
import type { TokenType } from '@/common/types';

export function TokensMixin<
    TBase extends new (...args: any[]) => any
>(Base: TBase) {
    return class extends Base {
        static extractToken(
            request: Request,
            type: TokenType
        ): string | null {
            return (
                ExtractJwt.fromAuthHeaderAsBearerToken()(request) ??
                request.cookies?.[type] ??
                null
            );
        }

        static getSecret(key: string): string {
            const secret = process.env[key] ?? '';

            if (!secret) {
                throw new InternalServerErrorException(
                    `${key} is not set`
                );
            }

            return secret;
        }
    };
}
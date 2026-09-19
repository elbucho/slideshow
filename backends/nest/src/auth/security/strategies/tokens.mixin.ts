import { Type } from '@nestjs/common';
import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import {AuthenticationRequiredException} from "@/common/exceptions";

export function TokensMixin<TBase extends Type<any>>(
    Base: TBase
) {
    return class extends Base {
        static extractToken(
            request: Request
        ): string {
            const token = ExtractJwt
                .fromAuthHeaderAsBearerToken()(
                    request
                );

            if (token) return token;

            throw new AuthenticationRequiredException(
                'A bearer token is required to access ' +
                'this endpoint',
                {
                    path: request.path,
                    method: request.method
                }
            );
        }
    }
}
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

@Injectable()
export class CryptService {
    async hash(payload: string): Promise<string> {
        return argon2.hash(payload);
    }

    async verify(
        hashed: string,
        plain: string
    ): Promise<boolean> {
        return argon2.verify(hashed, plain);
    }
}
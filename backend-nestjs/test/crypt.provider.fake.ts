import { ICryptProvider } from '@/auth/crypt.provider.interface';
import { Buffer } from 'buffer';

export class CryptProviderFake implements ICryptProvider {
  async hash(value: string, hashRounds: number): Promise<string> {
    return Buffer.from(value).toString('base64');
  }

  async hashMatches(value: string, hash: string): Promise<boolean> {
    const newHash = Buffer.from(value).toString('base64');

    return newHash === hash;
  }
}
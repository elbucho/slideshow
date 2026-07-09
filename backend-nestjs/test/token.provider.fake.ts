import { ITokenProvider } from '@/auth/token.provider.interface';
import { TokenPayloadDto } from '@/auth/dto/token-payload.dto';
import { Buffer } from 'buffer';

export class TokenProviderFake implements ITokenProvider {
  async signToken(secret: string, timeoutMs: number, payload: TokenPayloadDto): Promise<string> {
    const packet = {
      secret,
      timeoutMs,
      payload,
    };

    return Buffer.from(JSON.stringify(packet)).toString('base64');
  }
}
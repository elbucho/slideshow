import { ITokenProvider } from '@/auth/token.provider.interface'
import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";
import { JwtService } from "@nestjs/jwt";

export class TokenProviderJwt implements ITokenProvider {
  async signToken(secret: string, timeoutMs: number, payload: TokenPayloadDto): Promise<string> {
    const service = new JwtService();

    return service.sign(payload, {
      secret: secret,
      expiresIn: `${timeoutMs}ms`,
    });
  }
}
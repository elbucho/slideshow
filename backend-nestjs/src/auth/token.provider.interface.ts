import { TokenPayloadDto } from "@/auth/dto/token-payload.dto";

export interface ITokenProvider {
  signToken(secret: string, timeoutMs: number, payload: TokenPayloadDto): Promise<string>;
}
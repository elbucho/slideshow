import { TokensDto } from "@/auth/dto/tokens.dto";

export interface LoginResponseDto {
  userId: number;
  tokens: TokensDto;
}
import { IsString, Length, IsStrongPassword } from "class-validator";

export class CreateSessionDto {
  userId: number;

  @IsString()
  tokenHash: string;
}

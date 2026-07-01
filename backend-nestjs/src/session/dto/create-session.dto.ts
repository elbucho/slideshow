import { IsString } from "class-validator";

export class CreateSessionDto {
  userId!: number;

  @IsString()
  tokenHash!: string;
}

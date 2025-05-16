import { IsString, IsStrongPassword, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({
    description: "Username for the new user",
    minimum: 1,
    maximum: 32,
    default: "Test1234",
  })
  @IsString()
  @Length(1, 32)
  username: string;

  @ApiProperty({
    description: "Password for the new user",
  })
  @IsStrongPassword()
  password: string;
}

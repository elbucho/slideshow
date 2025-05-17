import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, IsStrongPassword } from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    minimum: 1,
    maximum: 32,
    example: "Test1234",
  })
  @IsString()
  @Length(1, 32)
  username: string;

  @ApiProperty({
    description:
      "Minimum requirements: length=8, lowercase=1, uppercase=1, numbers=1, symbols=1",
    example: "Str0ngP4ssw0rd!",
  })
  @IsStrongPassword()
  password: string;
}

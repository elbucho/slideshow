import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePersonDto {
  @ApiProperty({
    minimum: 1,
    maximum: 32,
    example: "John",
  })
  @IsString()
  @Length(1, 32)
  firstName!: string;

  @ApiProperty({
    minimum: 1,
    maximum: 32,
    example: "Doe",
  })
  @IsString()
  @Length(1, 32)
  lastName!: string;
}

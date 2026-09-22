import {
    IsEmail,
    IsNotEmpty,
    IsDefined
} from 'class-validator';

export class CreateUserDto {
    @IsDefined()
    @IsEmail()
    email: string;

    @IsDefined()
    @IsNotEmpty()
    username: string;

    @IsDefined()
    @IsNotEmpty()
    password: string;
}
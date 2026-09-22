import {
    IsEmail,
    IsNotEmpty,
    IsOptional
} from 'class-validator';
import { AtLeastOne } from
        '@/common/decorators/at-least-one.decorator';

@AtLeastOne()
export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsNotEmpty()
    username?: string;

    @IsOptional()
    @IsNotEmpty()
    password?: string;
}
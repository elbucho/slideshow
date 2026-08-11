import { IsIP } from 'class-validator';

export class CreateSessionDto {
    userId: number;
    userAgent?: string;

    @IsIP()
    ipAddress?: string;
}
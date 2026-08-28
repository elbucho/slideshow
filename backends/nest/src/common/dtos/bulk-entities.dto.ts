import { IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEntitiesDto {
    @IsArray()
    @ArrayMinSize(1)
    @Type(() => Number)
    ids: number[];
}
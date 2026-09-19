import { IsArray, IsDefined, ArrayMinSize, IsInt} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEntitiesDto {
    @IsDefined()
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Type(() => Number)
    ids: number[];
}

export interface BulkEntitiesDeleteResponse {
    foundIds: number[];
    deletedIds: number[];
}
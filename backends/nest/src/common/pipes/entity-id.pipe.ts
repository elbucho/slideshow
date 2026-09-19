import {
    Injectable,
    PipeTransform,
    ArgumentMetadata
} from '@nestjs/common';
import { ValidationErrorException } from '@/common/exceptions';

@Injectable()
export class EntityIdPipe implements PipeTransform<
    string, number
> {
    transform(
        value: string,
        metadata: ArgumentMetadata
    ): number {
        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed < 1) {
            throw new ValidationErrorException(
                `Parameter ${metadata.data} must be ` +
                `a positive integer`
            );
        }

        return parsed;
    }
}
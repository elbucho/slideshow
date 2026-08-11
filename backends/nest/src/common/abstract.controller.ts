import { All, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MethodNotAllowedException } from '@/common/exceptions';

export abstract class AbstractController {
    @All()
    protected async match(
        @Req() request: Request,
    ): Promise<void> {
        throw new MethodNotAllowedException(
            request
        );
    }
}

import { SetMetadata } from '@nestjs/common';

export const SKIP_DEFAULT_GUARD = 'skipDefaultGuard';
export const SkipDefaultGuard = () =>
    SetMetadata(SKIP_DEFAULT_GUARD, true);
import {
    plainToInstance,
    instanceToPlain,
    Transform,
    Type
} from 'class-transformer';
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsString,
    IsOptional,
    validateSync
} from 'class-validator';

function normalizeBool(value: unknown): unknown {
    if (typeof value === 'string') {
        const normalized = value.toLowerCase();

        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }

    return value;
}

export class EnvironmentVariables {
    @IsIn(['development', 'test', 'production'])
    NODE_ENV!: string;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    APP_PORT?: number;

    @IsString()
    @IsNotEmpty()
    POSTGRES_HOST!: string;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    POSTGRES_PORT?: number;

    @IsString()
    @IsNotEmpty()
    POSTGRES_DATABASE!: string;

    @IsString()
    @IsNotEmpty()
    POSTGRES_USERNAME!: string;

    @IsString()
    @IsNotEmpty()
    POSTGRES_PASSWORD!: string;

    @Transform(({ value }) => normalizeBool(value))
    @IsBoolean()
    @IsOptional()
    POSTGRES_SYNC?: boolean;

    @Transform(({ value }) => normalizeBool(value))
    @IsBoolean()
    @IsOptional()
    POSTGRES_AUTOLOAD?: boolean;

    @IsString()
    @IsNotEmpty()
    JWT_ACCESS_SECRET!: string;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    JWT_ACCESS_TIMEOUT_MS?: number;

    @IsString()
    @IsNotEmpty()
    JWT_REFRESH_SECRET!: string;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    JWT_REFRESH_TIMEOUT_MS?: number;

    @IsString()
    @IsNotEmpty()
    JWT_TEMP_SECRET!: string;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    JWT_TEMP_TIMEOUT_MS?: number;

    @IsString()
    @IsNotEmpty()
    JWT_MFA_SECRET!: string;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    JWT_MFA_TIMEOUT_MS?: number;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    USER_LOCK_TIMEOUT_MS?: number;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    USER_MAX_FAILED_LOGINS?: number;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    USER_MAX_SESSIONS?: number;
}

export function validate(
    config: Record<string, unknown>,
): Record<string, unknown> {
    const validatedConfig = plainToInstance(
        EnvironmentVariables,
        config
    );

    const errors = validateSync(
        validatedConfig,
        {
            skipMissingProperties: false
        }
    );

    if (errors.length > 0) {
        throw new Error(
            errors
                .flatMap(error =>
                    Object.values(error.constraints ?? {})
                )
                .join('\n')
        );
    }

    return instanceToPlain(validatedConfig);
}
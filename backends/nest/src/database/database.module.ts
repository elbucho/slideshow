import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './database.config';
import { QueryFieldRegistryService } from
        '@/database/query-field-registry.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ ConfigModule ],
            inject: [ ConfigService ],
            useFactory: getDatabaseConfig
        }),
    ],
    providers: [ QueryFieldRegistryService ]
})
export class DatabaseModule {}
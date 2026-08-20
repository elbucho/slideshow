import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getDatabaseConfig(
    configService: ConfigService
): TypeOrmModuleOptions {
    return {
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get('database.database'),

        autoLoadEntities: configService.get('database.autoloadEntities'),
        synchronize: configService.get('database.sync')
    };
}
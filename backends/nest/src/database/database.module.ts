import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './database.config';

@Global()
@Module({
    imports: [
        TypeOrmModule.forRoot(getDatabaseConfig()),
    ],
})
export class DatabaseModule {}
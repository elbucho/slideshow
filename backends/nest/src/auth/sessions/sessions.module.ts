import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from "@nestjs/jwt";
import { Session } from '@/database/entities/session.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { CryptModule } from '@/crypt/crypt.module';
import { SecurityModule } from '@/auth/security/security.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Session]),
        JwtModule,
        CryptModule,
        SecurityModule
    ],
    controllers: [ SessionsController ],
    providers: [ SessionsService ],
    exports: [ SessionsService ]
})
export class SessionsModule {}
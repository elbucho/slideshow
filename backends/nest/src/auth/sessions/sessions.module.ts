import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from "@nestjs/jwt";
import { Session } from '@/database/entities/session.entity';
import { SessionsService } from './sessions.service';
import { CryptModule } from '@/crypt/crypt.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Session]),
        JwtModule,
        CryptModule
    ],
    controllers: [],
    providers: [ SessionsService ],
    exports: [ SessionsService ]
})
export class SessionsModule {}
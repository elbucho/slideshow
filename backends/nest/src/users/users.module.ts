import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/database/entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StateModule } from '@/states/state.module';
import { CryptModule } from '@/crypt/crypt.module';
import { SessionsModule } from '@/auth/sessions/sessions.module'

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        StateModule,
        CryptModule,
        SessionsModule
    ],
    controllers: [ UsersController ],
    providers: [ UsersService ],
    exports: [ UsersService ]
})
export class UsersModule {}

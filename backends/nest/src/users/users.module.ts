import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { StateModule } from '@/states/state.module';
import { CryptModule } from '@/crypt/crypt.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        StateModule,
        CryptModule
    ],
    controllers: [],
    providers: [ UsersService ],
    exports: [ UsersService ]
})
export class UsersModule {}

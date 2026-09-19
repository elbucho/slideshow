import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatesService } from './states.service';
import { UserStatesService } from './user-states.service';
import { State } from '@/database/entities/state.entity';
import { UserState } from '@/database/entities/user-state.entity';
import { CryptModule } from '@/crypt/crypt.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            State,
            UserState
        ]),
        CryptModule
    ],
    providers: [
        StatesService,
        UserStatesService
    ],
    exports: [
        StatesService,
        UserStatesService
    ]
})
export class StateModule { }
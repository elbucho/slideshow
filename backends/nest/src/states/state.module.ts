import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatesService } from './states.service';
import { UserStatesService } from './user-states.service';
import { State } from '@/database/entities/state.entity';
import { UserState } from '@/database/entities/user-state.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            State,
            UserState
        ])
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
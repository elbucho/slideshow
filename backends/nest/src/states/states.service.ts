import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { State } from '@/database/entities/state.entity';
import { UserStateName } from '@/states/user-states.types';
import { AbstractService } from '@/common/abstract.service';

@Injectable()
export class StatesService extends AbstractService<State> {
    constructor(
        configService: ConfigService,
        eventEmitter: EventEmitter2,

        @InjectRepository(State)
        repository: Repository<State>
    ) {
        super(
            configService,
            eventEmitter,
            repository
        );
    }

    async findOrCreate(name: UserStateName): Promise<State> {
        let state = await this.findOne({
            where: 'state.name = :name',
            params: { name }
        });

        if (state) return state;

        state = new State();
        state.name = name;
        return this.save(state);
    }
}

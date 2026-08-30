import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
    InternalServerErrorException,
    ResourceNotFoundException
} from '@/common/exceptions';
import { State } from '@/database/entities/state.entity';
import { UserStateName } from '@/states/user-states.types';

@Injectable()
export class StatesService {
    constructor(
        @InjectRepository(State)
        private readonly states: Repository<State>
    ) { }

    async findByName(name: UserStateName): Promise<State> {
        const state = await this.states.findOneBy({
            name
        });

        if (!state) {
            throw new ResourceNotFoundException(
                'state',
                'name',
                name
            );
        }

        return state;
    }

    async findOrCreate(name: UserStateName): Promise<State> {
        let state: State;

        try {
            state = await this.findByName(name);
        } catch (exception: any) {
            if (exception instanceof ResourceNotFoundException) {
                state = new State();
                state.name = name;
                state = await this.save(state);
            } else {
                throw new InternalServerErrorException(
                    exception.message ?? 'Internal server error',
                    exception.stack ?? { }
                );
            }
        }

        return state;
    }

    async findAllByNames(names: UserStateName[]): Promise<State[]> {
        return this.states.find({
            where: {
                name: In(names)
            }
        });
    }

    async save(state: State): Promise<State> {
        return this.states.save(state);
    }

    async bulkSave(states: State[]): Promise<State[]> {
        return this.states.save(states);
    }
}

import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { State } from '@/database/entities/state.entity';
import { UserStateName } from './user-states.types';
import { StatesService } from './states.service';

describe('StatesService', () => {
    let statesService: StatesService;
    let configService: ConfigService;
    let eventEmitter: EventEmitter2;
    let repository: Repository<State>;

    beforeEach(() => {
        configService = {

        } as any as ConfigService;

        eventEmitter = {

        } as any as EventEmitter2;

        repository = {
            metadata: {
                name: 'State'
            }
        } as any as jest.Mocked<Repository<State>>;

        statesService = new StatesService(
            configService,
            eventEmitter,
            repository
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findOrCreate', () => {
        let findOne: jest.Mock;

        beforeEach(() => {
            const service = statesService as unknown as {
                findOne: jest.Mock;
            };

            findOne = jest.spyOn(
                service,
                'findOne'
            ) as jest.Mock;
        })

        it(
            'should return a state if it already exists',
            async () => {
                const state = {} as any as State;

                findOne.mockResolvedValue(state);

                await expect(
                    statesService.findOrCreate(
                        'test' as UserStateName
                    )
                ).resolves.toBe(state);

                expect(findOne)
                    .toHaveBeenCalledWith({
                        where: 'state.name = :name',
                        params: { name: 'test' }
                    });
            }
        );

        it(
            'should create a new state if one wasn\'t found',
            async () => {
                const state = {
                    id: 1,
                    name: 'test',
                } as any as State;

                findOne.mockResolvedValue(null);

                jest.spyOn(
                    statesService,
                    'save'
                ).mockResolvedValue(state);

                await expect(
                    statesService.findOrCreate(
                        'test' as UserStateName
                    )
                ).resolves.toBe(state);

                expect(statesService.save)
                    .toHaveBeenCalledWith(
                        expect.any(State)
                    );
            }
        );
    });
});
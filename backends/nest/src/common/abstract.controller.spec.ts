import { Request } from 'express';
import { AbstractController } from './abstract.controller';
import {MethodNotAllowedException} from "@/common/exceptions";

class TestController extends AbstractController {}

describe('AbstractController', () => {
    describe('match', () => {
        it(
            'should throw a MethodNotAllowedException ' +
            'for anything that hits the match function, ' +
            'since it wasn\'t caught first by a different ' +
            'method',
            async () => {
                const request = {} as Request;
                const controller = new TestController();

                await expect(
                    controller.match(request)
                ).rejects.toThrow(
                    new MethodNotAllowedException(
                        request
                    )
                );
            }
        );
    });
});


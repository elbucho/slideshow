import { Controller } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { AbstractController } from '@/common/abstract.controller';

type GetResponse = {
  foo: string;
  bars: number;
}

type AppResponses = {
  GET: GetResponse
}

@Controller()
export class AppController extends AbstractController<AppResponses>{
  constructor(private readonly appService: AppService) {
    super()
  }

  protected get(request: Request): AppResponses['GET'] {
    this.message = this.appService.getHello();

    return {
      foo: 'Mary had lamb count',
      bars: 3
    };
  }
}

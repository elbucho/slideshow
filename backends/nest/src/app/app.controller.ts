import { Controller, Get} from '@nestjs/common';
import { AppService } from './app.service';
import { AbstractController } from '@/common/abstract.controller';
import { MessageResponse } from '@/common/types';

type GetResponse = {
  foo: string;
  bars: number;
}

@Controller()
export class AppController extends AbstractController {
  constructor(private readonly appService: AppService) {
    super()
  }

  @Get('/')
  protected async get(): Promise<MessageResponse<GetResponse>> {
    return {
      message: this.appService.getHello(),
      data: {
        foo: 'Mary had lamb count',
        bars: 3
      }
    };
  }
}

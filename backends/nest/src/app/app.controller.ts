import { Controller, Get} from '@nestjs/common';
import { AppService } from './app.service';
import { AbstractController } from '@/common/abstract.controller';
import { APIResponse } from '@/common/types';
import { SkipDefaultGuard } from
      '@/auth/decorators/skip-default-guard.decorator';

type GetResponse = {
  message: string;
  foo: string;
  bars: number;
}

@SkipDefaultGuard()
@Controller()
export class AppController extends AbstractController {
  constructor(private readonly appService: AppService) {
    super()
  }

  @Get('/')
  protected async get(): Promise<APIResponse<GetResponse>> {
    return {
      type: 'success',
      code: 'RESOURCE_FETCHED',
      details: {
        message: this.appService.getHello(),
        foo: 'Mary had lamb count',
        bars: 3,
      }
    };
  }
}

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@/app/app.module';
import { configureApp } from '@/app/helpers/configure-app.helper';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set up filters and pipes
  configureApp(app);

  const configService =
      app.get<ConfigService>(ConfigService);
  const port = configService.get('app.port');

  await app.listen(port);
}

bootstrap().then();

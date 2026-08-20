import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app/app.module';
import { ErrorResponseFilter } from '@/common/error-response.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Catch any exceptions and return them as an ErrorResponse JSON object
  app.useGlobalFilters(new ErrorResponseFilter());

  // Ensure proper validation for DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));

  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get('app.port');

  // Provide cookie parsing capability
  app.use(cookieParser());

  await app.listen(port);
}

bootstrap().then();

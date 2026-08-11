import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  await app.listen(process.env.PORT ?? 8000);
}

bootstrap().then();

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ErrorResponseFilter } from '@/common/error-response.filter';

export function configureApp(app: INestApplication) {
    app.useGlobalFilters(new ErrorResponseFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
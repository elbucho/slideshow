import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle("Slideshow")
    .setDescription("A basic slideshow application")
    .setVersion("1.0")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("", app, documentFactory);

  app.use(cookieParser());

  const configService = app.get<ConfigService>(ConfigService);
  process.env.NODE_ENV?.includes("prod") ||
    (await app.listen(+configService.get("APP_PORT") || 3000));
}
bootstrap();

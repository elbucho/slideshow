import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("Slideshow")
    .setDescription("A basic slideshow application")
    .setVersion("1.0")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("", app, documentFactory);

  const configService = app.get<ConfigService>(ConfigService);

	console.log(configService.get<number>("APP_PORT"));

  process.env.NODE_ENV?.includes("prod") ||
    (await app.listen(configService.get<number>("APP_PORT") || 3000));
}
bootstrap();

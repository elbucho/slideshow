import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { SequelizeModule } from "@nestjs/sequelize";
import { DatabaseConfigService } from "./database/database-config.service";
import { UserModule } from "./user/user.module";

const env = process.env.NODE_ENV ?? "development.local";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${env}`, ".env"],
    }),
    SequelizeModule.forRootAsync({
      useClass: DatabaseConfigService,
    }),
    AuthModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

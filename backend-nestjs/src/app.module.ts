import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { UserController } from "./user/user.controller";
import { UserModule } from "./user/user.module";
import { UserService } from "./user/user.service";

const env = process.env.NODE_ENV ?? "development.local";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${env}`, ".env"],
    }),
    AuthModule,
    UserModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class AppModule {}

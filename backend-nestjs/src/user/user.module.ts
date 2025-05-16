import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { usersProvider } from "./user.providers";
import { DatabaseModule } from "src/database/database.module";
import { UserController } from "./user.controller";

@Module({
  imports: [DatabaseModule],
  providers: [UserService, ...usersProvider],
  controllers: [UserController],
  exports: [...usersProvider],
})
export class UserModule {}

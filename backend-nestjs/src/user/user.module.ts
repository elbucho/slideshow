import { Module, forwardRef } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { User } from "./entities/user.entity";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [
		SequelizeModule.forFeature([User]), 
		forwardRef(() => AuthModule)
	],
  controllers: [UserController],
  providers: [UserService],
	exports: [UserService]
})
export class UserModule {}

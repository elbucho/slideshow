import { Module, forwardRef } from "@nestjs/common";
import { UserService } from "@/user/user.service";
import { UserController } from "@/user/user.controller";
import { User } from "@/user/entities/user.entity";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [SequelizeModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

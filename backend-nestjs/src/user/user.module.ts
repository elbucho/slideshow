import { Module, forwardRef } from "@nestjs/common";
import { UserService } from "@/user/user.service";
import { UserController } from "@/user/user.controller";
import { User } from "@/user/entities/user.entity";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "@/auth/auth.module";
import { Providers } from "@/config";
import { UserProviderSequelize } from "@/user/user.provider.sequelize";

@Module({
  imports: [SequelizeModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: Providers.user,
      useClass: UserProviderSequelize
    }
  ],
  exports: [UserService],
})
export class UserModule {}

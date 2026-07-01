import { Module, forwardRef } from "@nestjs/common";
import { SessionService } from "@/session/session.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { Session } from "@/session/entities/session.entity";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [
    SequelizeModule.forFeature([Session]),
    forwardRef(() => AuthModule),
  ],
  controllers: [],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}

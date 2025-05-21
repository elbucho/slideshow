import { Module, forwardRef } from "@nestjs/common";
import { SessionService } from "./session.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { Session } from "./entities/session.entity";
import { AuthModule } from "src/auth/auth.module";

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

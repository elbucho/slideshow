import { Module } from "@nestjs/common";
import { SessionService } from "@/session/session.service";
import { Providers } from "@/config";
import { SessionProviderSequelize } from "@/session/session.provider.sequelize";
import { SequelizeModule } from "@nestjs/sequelize";
import { Session } from "@/session/entities/session.entity";

@Module({
  imports: [
    ...(process.env.NODE_ENV === "test"
      ? []
      : [SequelizeModule.forFeature([Session])]),
  ],
  controllers: [],
  providers: [
    SessionService,
    {
      provide: Providers.session,
      useClass: SessionProviderSequelize,
    },
  ],
  exports: [SessionService],
})
export class SessionModule {}

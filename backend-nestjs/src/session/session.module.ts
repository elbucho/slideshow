import { Module } from "@nestjs/common";
import { SessionService } from "@/session/session.service";
import { Providers } from "@/config";
import { SessionProviderSequelize } from "@/session/session.provider.sequelize";

@Module({
  imports: [],
  controllers: [],
  providers: [
    SessionService,
    {
      provide: Providers.session,
      useClass: SessionProviderSequelize
    }
  ],
  exports: [SessionService],
})
export class SessionModule {}

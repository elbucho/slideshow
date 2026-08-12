import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '@/database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from '@/audit/audit.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { SessionsModule } from '@/auth/sessions/sessions.module';

@Module({
  imports: [
      DatabaseModule,
      EventEmitterModule.forRoot(),
      AuditModule,
      AuthModule,
      UsersModule,
      SessionsModule
  ],
  controllers: [AppController],
  providers: [
      AppService,
      JwtService
  ],
})
export class AppModule { }

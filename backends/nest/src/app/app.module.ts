import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from '@/audit/audit.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { SessionsModule } from '@/auth/sessions/sessions.module';
import { StateModule } from '@/states/state.module';
import { LoggerModule } from '@/logger/logger.module';
import { validate } from '@/config/env.validation';
import configuration from '@/config/configuration';

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,

          load: [
              configuration
          ],

          validate,
      }),
      DatabaseModule,
      EventEmitterModule.forRoot(),
      LoggerModule,
      AuditModule,
      AuthModule,
      UsersModule,
      SessionsModule,
      StateModule
  ],
  controllers: [ AppController ],
  providers: [
      AppService,
      JwtService
  ],
})
export class AppModule { }

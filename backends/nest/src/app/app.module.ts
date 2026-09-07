import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from '@/audit/audit.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { LoggerModule } from '@/logger/logger.module';
import { validate } from '@/config/env.validation';
import { ListenersModule } from '@/listeners/listeners.module';
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
      ListenersModule
  ],
  controllers: [ AppController ],
  providers: [ AppService ],
})
export class AppModule { }

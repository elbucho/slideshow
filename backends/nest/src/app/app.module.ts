import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from '@/audit/audit.module';
import { AuthModule } from '@/auth/auth.module';
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
  ],
  controllers: [ AppController ],
  providers: [ AppService ],
})
export class AppModule { }

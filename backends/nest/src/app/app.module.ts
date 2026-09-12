import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/database/database.module';
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
  controllers: [],
  providers: [
      {
          // Add serialization filtering to remove @Exclude() fields
          // from being output to the user
          provide: APP_INTERCEPTOR,
          useFactory: (reflector: Reflector) =>
              new ClassSerializerInterceptor(reflector),
          inject: [ Reflector ]
      }
  ],
})
export class AppModule { }

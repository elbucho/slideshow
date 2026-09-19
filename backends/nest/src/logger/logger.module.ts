import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { createLoggerOptions } from './logger.config';
import { LogListener } from '@/listeners/log/log.listener';

@Global()
@Module({
    imports: [
        WinstonModule.forRootAsync({
            inject: [ ConfigService ],

            useFactory: (configService: ConfigService) => {
                return createLoggerOptions(configService);
            },
        }),
    ],
    providers: [
        LogListener
    ],
    exports: [
        WinstonModule,
    ],
})
export class LoggerModule {}
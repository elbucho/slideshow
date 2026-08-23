import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { createLoggerOptions } from './logger.config';

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
    exports: [
        WinstonModule,
    ],
})
export class LoggerModule {}
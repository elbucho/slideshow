import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export const createLoggerOptions = (
    configService: ConfigService
): winston.LoggerOptions => {
    const nodeEnv = configService.get('app.environment') as string;

    const filename =
        nodeEnv === 'test' ?
            'testing-%DATE%.log' :
            'application-%DATE%.log';

    const fileTransport = new DailyRotateFile({
        dirname: 'logs',
        filename: filename,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '10d',
        zippedArchive: false
    });

    fileTransport.on('error', (error) => {
        console.error('Winston file transport error:', error);
    });

    return {
        level: 'info',

        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss',
            }),

            winston.format.printf(({ timestamp, level, message, ...meta}) => {
                const metadata =
                    Object.keys(meta).length > 0
                    ? ` ${JSON.stringify(meta)}`
                    : '';

                return `[${timestamp}] ${level.toUpperCase()}: ${message}${metadata}`;
            }),
        ),

        transports: [
            fileTransport
        ],
    };
};
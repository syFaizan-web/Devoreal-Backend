import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

// Factory to create a configured Winston logger for NestJS.
// Safe and backward-compatible: adds file transports while preserving console output.
export function createAppLogger(logLevel: string = process.env.LOG_LEVEL || 'info') {
  const logDir = process.env.LOG_FILE_PATH || './logs';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike(process.env.APP_NAME || 'NestApp', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
    new DailyRotateFile({
      filename: `${logDir}/app-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ];

  return WinstonModule.createLogger({
    level: logLevel,
    transports,
    handleExceptions: true,
  });
}

// Options factory for WinstonModule.forRoot(...) so the provider exists for DI.
// Safe: mirrors console/file config used above.
export function createWinstonOptions(logLevel: string = process.env.LOG_LEVEL || 'info'): WinstonModuleOptions {
  const logDir = process.env.LOG_FILE_PATH || './logs';
  return {
    level: logLevel,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike(process.env.APP_NAME || 'NestApp', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      new DailyRotateFile({
        filename: `${logDir}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      new DailyRotateFile({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
    handleExceptions: true,
  };
}



import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const logLevel = this.configService.get('LOG_LEVEL', 'info');
    const logFilePath = this.configService.get('LOG_FILE_PATH', './logs');
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    // Console transport
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        }),
      ),
    });

    // File transport for production
    const fileTransport = new DailyRotateFile({
      filename: `${logFilePath}/application-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    });

    // Error file transport
    const errorFileTransport = new DailyRotateFile({
      filename: `${logFilePath}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: logFormat,
    });

    // Create logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports: [consoleTransport],
    });

    // Add file transports in production
    if (isProduction) {
      this.logger.add(fileTransport);
      this.logger.add(errorFileTransport);
    }
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Additional methods for structured logging
  logWithMeta(level: string, message: string, meta: any, context?: string) {
    this.logger.log(level, message, { ...meta, context });
  }

  logRequest(req: any, context?: string) {
    this.logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      context,
    });
  }

  logResponse(req: any, res: any, responseTime: number, context?: string) {
    this.logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      context,
    });
  }
}

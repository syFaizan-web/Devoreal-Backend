import { CallHandler, ExecutionContext, Injectable, NestInterceptor, LoggerService as NestLoggerService } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: NestLoggerService | Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();

    const method = req?.method;
    const url = req?.originalUrl || req?.url;
    const ip = req?.ip || req?.connection?.remoteAddress;
    const requestId = req?.headers?.['x-request-id'] || req?.id;
    const userId = req?.user?.id;
    const userAgent = req?.headers?.['user-agent'];

    const sanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const redactions = ['password', 'token', 'authorization', 'creditCard', 'cardNumber', 'cvv', 'secret', 'apiKey'];
      const cloned: any = Array.isArray(obj) ? [...obj] : { ...obj };
      for (const key of Object.keys(cloned)) {
        if (redactions.includes(key)) cloned[key] = '[REDACTED]';
        else if (typeof cloned[key] === 'object') cloned[key] = sanitize(cloned[key]);
      }
      return cloned;
    };

    const logFullBody = (process.env.LOG_FULL_BODY || 'false').toLowerCase() === 'true';
    const logResponseBody = (process.env.LOG_RESPONSE_BODY || 'false').toLowerCase() === 'true';
    const bodyForLog = logFullBody ? sanitize(req?.body) : undefined;

    (this.logger as any).log?.('http_request', {
      event: 'http_request',
      method,
      url,
      ip,
      requestId,
      userId,
      userAgent,
      requestBodySanitized: bodyForLog,
    });

    return next.handle().pipe(
      tap((responseData) => {
        const durationMs = Date.now() - start;
        (this.logger as any).log?.('http_response', {
          event: 'http_response',
          method,
          url,
          statusCode: res?.statusCode,
          durationMs,
          requestId,
          userId,
          responseBody: logResponseBody ? sanitize(responseData) : undefined,
        });
      }),
      catchError((err) => {
        const durationMs = Date.now() - start;
        // Avoid full error logging here; let the global exception filter handle it.
        (this.logger as any).debug?.('http_error_forwarded', {
          event: 'http_error_forwarded',
          method,
          url,
          durationMs,
          requestId,
          userId,
        });
        throw err;
      }),
    );
  }
}

// Removed duplicate legacy interceptor to avoid symbol conflicts.

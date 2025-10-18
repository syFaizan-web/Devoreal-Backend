import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { FastifyRequest } from 'fastify';

// Simple in-memory store for rate limiting
// In production, you should use Redis or another persistent store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const key = this.generateKey(request, rateLimitOptions);
    const now = Date.now();
    const windowMs = rateLimitOptions.ttl * 1000;

    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= rateLimitOptions.limit) {
      // Rate limit exceeded
      const resetTime = new Date(current.resetTime);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: rateLimitOptions.message || 'Too many requests',
          retryAfter: Math.ceil((current.resetTime - now) / 1000),
          resetTime: resetTime.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    current.count++;
    rateLimitStore.set(key, current);

    return true;
  }

  private generateKey(request: FastifyRequest, options: RateLimitOptions): string {
    // Use IP address and user agent for rate limiting
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    // For login attempts, also include the email if available
    const body = request.body as any;
    const email = body?.email ? `:${body.email}` : '';
    
    return `rate_limit:${ip}:${userAgent}${email}`;
  }

  // Clean up expired entries periodically
  static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(() => {
  RateLimitGuard.cleanupExpiredEntries();
}, 5 * 60 * 1000);


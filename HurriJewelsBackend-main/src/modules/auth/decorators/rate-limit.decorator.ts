import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  ttl: number; // Time window in seconds
  limit: number; // Maximum number of requests
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

// Predefined rate limit configurations
export const LOGIN_RATE_LIMIT = RateLimit({
  ttl: 900, // 15 minutes
  limit: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true,
});

export const REGISTER_RATE_LIMIT = RateLimit({
  ttl: 3600, // 1 hour
  limit: 3, // 3 registrations per hour per IP
  message: 'Too many registration attempts. Please try again in 1 hour.',
  skipSuccessfulRequests: true,
});

export const PASSWORD_RESET_RATE_LIMIT = RateLimit({
  ttl: 3600, // 1 hour
  limit: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts. Please try again in 1 hour.',
  skipSuccessfulRequests: true,
});


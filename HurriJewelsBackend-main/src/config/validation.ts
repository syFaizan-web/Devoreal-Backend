import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Server configuration
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Database configuration
  DATABASE_URL: Joi.string().required(),

  // JWT configuration
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // AWS configuration
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().optional().allow(''),

  // Stripe configuration
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional().allow(''),

  // Email configuration
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().optional().allow(''),

  // Redis configuration
  REDIS_URL: Joi.string().optional().allow(''),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // File upload configuration
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  MAX_FILES: Joi.number().default(10),
  UPLOAD_PATH: Joi.string().default('./uploads'),

  // Rate limiting configuration
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Logging configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),

  // Security configuration
  BCRYPT_ROUNDS: Joi.number().default(12),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
});

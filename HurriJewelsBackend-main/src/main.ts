import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { createAppLogger } from './libs/logger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { FastifyStaticOptions } from '@fastify/static';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestContextService } from './common/services/request-context.service';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
    { logger: createAppLogger() },
  );

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Register multipart support for file uploads
  await app.register(require('@fastify/multipart'), {
    attachFieldsToBody: true, // attaches text fields into req.body for DTO validation
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });


  // Serve static files (uploaded images)
  await app.register(require('@fastify/static'), {
    root: join(__dirname, '..', 'uploads'),
    prefix: '/uploads/',
  } as FastifyStaticOptions);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(WINSTON_MODULE_NEST_PROVIDER) as any));

  // Global interceptors
  const requestContext = app.get(RequestContextService);
  app.useGlobalInterceptors(
    new LoggingInterceptor(app.get(WINSTON_MODULE_NEST_PROVIDER) as any),
    new RequestContextInterceptor(requestContext),
    // Note: AuditInterceptor will be applied per controller as needed
  );

  // Swagger documentation (only in non-production)
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HurriJewels Backend API')
      .setDescription('HurriJewels Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addTag('app', 'Application endpoints')
      .addTag('authentication', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('products', 'Product management endpoints')
      .addTag('categories', 'Category management endpoints')
      .addTag('menu', 'Menu management endpoints')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Start the application
  const port = configService.get('PORT', 5000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error starting application', error.stack);
  process.exit(1);
});

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed',
  })
  check() {
    return this.health.check([
      async () => {
        try {
          await this.prismaService.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (error) {
          throw new Error('Database connection failed');
        }
      },
    ]);
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Pong response',
  })
  ping() {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }
}

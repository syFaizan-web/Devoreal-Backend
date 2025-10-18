import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextService } from '../services/request-context.service';

@Global()
@Module({
  providers: [PrismaService, RequestContextService],
  exports: [PrismaService, RequestContextService],
})
export class DatabaseModule {}

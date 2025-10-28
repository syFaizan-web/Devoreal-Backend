import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, PrismaService],
  exports: [ShippingService],
})
export class ShippingModule {}



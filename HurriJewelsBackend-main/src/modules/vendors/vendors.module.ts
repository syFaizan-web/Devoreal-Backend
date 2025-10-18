import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  controllers: [VendorsController, AdminVendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
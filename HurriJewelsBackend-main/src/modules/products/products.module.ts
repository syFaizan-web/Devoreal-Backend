import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { FileUploadModule } from '../../common/file-upload/file-upload.module';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [FileUploadModule, DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

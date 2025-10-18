import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { FileUploadModule } from '../../common/file-upload/file-upload.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../common/database/database.module';
import { AssetsService } from '../../common/services/assets.service';

@Module({
  imports: [FileUploadModule, DatabaseModule, ConfigModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, AssetsService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

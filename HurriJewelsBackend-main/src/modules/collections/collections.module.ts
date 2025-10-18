import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { FileUploadModule } from '../../common/file-upload/file-upload.module';
import { AssetsService } from '../../common/services/assets.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [FileUploadModule, ConfigModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, AssetsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}



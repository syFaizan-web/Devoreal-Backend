import { Module } from '@nestjs/common';
import { SignaturePiecesController } from './signature-pieces.controller';
import { SignaturePiecesService } from './signature-pieces.service';
import { FileUploadModule } from '../../common/file-upload/file-upload.module';

@Module({
  imports: [FileUploadModule],
  controllers: [SignaturePiecesController],
  providers: [SignaturePiecesService],
  exports: [SignaturePiecesService],
})
export class SignaturePiecesModule {}



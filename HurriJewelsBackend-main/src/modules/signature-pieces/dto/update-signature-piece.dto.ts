import { PartialType } from '@nestjs/swagger';
import { CreateSignaturePieceDto } from './create-signature-piece.dto';

export class UpdateSignaturePieceDto extends PartialType(CreateSignaturePieceDto) {}



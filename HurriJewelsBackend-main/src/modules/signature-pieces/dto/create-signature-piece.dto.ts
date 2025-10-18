import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSignaturePieceDto {
  @ApiProperty({ example: 'Halo Collection' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'halo-collection' })
  @IsString()
  @MaxLength(160)
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}



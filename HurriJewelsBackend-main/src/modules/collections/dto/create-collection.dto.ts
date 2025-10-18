import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Bridal Collection' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'bridal-collection' })
  @IsString()
  @MaxLength(160)
  slug: string;

  @ApiProperty({ required: false, example: 'Handpicked bridal designs' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiProperty({ required: false, example: 'uploads/collections/abc.webp' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}



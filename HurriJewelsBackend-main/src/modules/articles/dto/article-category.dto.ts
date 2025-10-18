import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateArticleCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Technology' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Category description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateArticleCategoryDto {
  @ApiProperty({ description: 'Category name', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Category description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}


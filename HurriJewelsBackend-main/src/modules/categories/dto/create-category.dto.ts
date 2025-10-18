import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString({ message: 'Category name must be a string' })
  name: string;

  @ApiPropertyOptional({ description: 'Category slug (SEO friendly, optional - auto-generated from name if omitted)', required: false })
  @IsString({ message: 'Category slug must be a string' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  slug?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString({ message: 'Category description must be a string' })
  description?: string;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @IsOptional()
  @IsString({ message: 'Category image must be a string' })
  image?: string;

  @ApiPropertyOptional({ description: 'Whether the category is active', default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean = true;
}

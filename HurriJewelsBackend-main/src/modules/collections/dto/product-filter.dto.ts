import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ProductFilterDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 12, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Sort by', enum: ['price_asc','price_desc','newest','name_asc','name_desc'] })
  @IsOptional()
  @IsIn(['price_asc','price_desc','newest','name_asc','name_desc'])
  sort?: 'price_asc'|'price_desc'|'newest'|'name_asc'|'name_desc';

  @ApiPropertyOptional({ description: 'Category ID filter' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Vendor ID filter' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'In-stock only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Search in name/description' })
  @IsOptional()
  @IsString()
  search?: string;
}



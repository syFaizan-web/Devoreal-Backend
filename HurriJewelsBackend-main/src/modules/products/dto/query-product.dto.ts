import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsUUID, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class QueryProductDto {
  @ApiPropertyOptional({ description: 'Search term for name or description' })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by featured status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum price', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min price must be a number' })
  @Min(0, { message: 'Min price must be at least 0' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum price', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max price must be a number' })
  @Min(0, { message: 'Max price must be at least 0' })
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum stock level', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min stock must be a number' })
  @Min(0, { message: 'Min stock must be at least 0' })
  minStock?: number;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString({ message: 'Sort order must be either "asc" or "desc"' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

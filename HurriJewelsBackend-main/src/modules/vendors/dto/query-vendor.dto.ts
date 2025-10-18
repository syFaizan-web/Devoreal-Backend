import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class QueryVendorDto {
  @ApiPropertyOptional({ description: 'Search term for business name or description' })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum rating', minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min rating must be a number' })
  @Min(0, { message: 'Min rating must be at least 0' })
  @Max(5, { message: 'Min rating cannot exceed 5' })
  minRating?: number;

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

import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsUUID, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum SortField {
  NAME = 'name',
  PRICE = 'price',
  RATING = 'rating',
  REVIEWS_COUNT = 'reviewsCount',
  VIEWS = 'views',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class QueryProductDto {
  @ApiPropertyOptional({ description: 'Search term for name or description' })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by collection ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Collection ID must be a valid UUID' })
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Filter by signature piece ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Signature piece ID must be a valid UUID' })
  signaturePieceId?: string;

  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Store ID must be a valid UUID' })
  storeId?: string;

  @ApiPropertyOptional({ description: 'Filter by tags (comma-separated)' })
  @IsOptional()
  @IsString({ message: 'Tags must be a string' })
  tags?: string;

  @ApiPropertyOptional({ description: 'Filter by specific tag' })
  @IsOptional()
  @IsString({ message: 'Tag must be a string' })
  tag?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min price must be a number' })
  @Min(0, { message: 'Min price must be greater than or equal to 0' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max price must be a number' })
  @Min(0, { message: 'Max price must be greater than or equal to 0' })
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by signature pieces only' })
  @IsOptional()
  signaturePieces?: boolean;

  @ApiPropertyOptional({ description: 'Filter by featured products only' })
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active products only' })
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', enum: SortField })
  @IsOptional()
  @IsEnum(SortField, { message: 'Invalid sort field' })
  sortBy?: SortField;

  @ApiPropertyOptional({ description: 'Sort order', enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Invalid sort order' })
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be greater than 0' })
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;
}

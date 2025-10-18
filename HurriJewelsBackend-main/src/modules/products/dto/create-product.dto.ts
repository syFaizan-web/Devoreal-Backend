import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString({ message: 'Product name must be a string' })
  name: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString({ message: 'Product description must be a string' })
  description?: string;

  @ApiProperty({ description: 'Product price', minimum: 0 })
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be at least 0' })
  price: number;

  @ApiPropertyOptional({ description: 'Compare price (original price)', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Compare price must be a number' })
  @Min(0, { message: 'Compare price must be at least 0' })
  comparePrice?: number;

  @ApiPropertyOptional({ description: 'Product cost', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Cost must be a number' })
  @Min(0, { message: 'Cost must be at least 0' })
  cost?: number;

  @ApiPropertyOptional({ description: 'Product SKU' })
  @IsOptional()
  @IsString({ message: 'SKU must be a string' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Product barcode' })
  @IsOptional()
  @IsString({ message: 'Barcode must be a string' })
  barcode?: string;

  @ApiPropertyOptional({ description: 'Product weight', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0, { message: 'Weight must be at least 0' })
  weight?: number;

  @ApiPropertyOptional({ description: 'Product dimensions' })
  @IsOptional()
  @IsString({ message: 'Dimensions must be a string' })
  dimensions?: string;

  @ApiProperty({ description: 'Stock quantity', minimum: 0 })
  @IsNumber({}, { message: 'Stock quantity must be a number' })
  @Min(0, { message: 'Stock quantity must be at least 0' })
  stockQuantity: number;

  @ApiPropertyOptional({ description: 'Minimum stock level', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Min stock level must be a number' })
  @Min(0, { message: 'Min stock level must be at least 0' })
  minStockLevel?: number = 0;

  @ApiPropertyOptional({ description: 'Whether the product is active', default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether the product is featured', default: false })
  @IsOptional()
  @IsBoolean({ message: 'isFeatured must be a boolean' })
  isFeatured?: boolean = false;

  @ApiProperty({ description: 'Vendor ID' })
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Product images URLs (JSON string)' })
  @IsOptional()
  @IsString({ message: 'Images must be a string' })
  images?: string;

  @ApiPropertyOptional({ description: 'Product tags (JSON string)' })
  @IsOptional()
  @IsString({ message: 'Tags must be a string' })
  tags?: string;

  @ApiPropertyOptional({ description: 'Product attributes (JSON)' })
  @IsOptional()
  attributes?: any;
}

import { IsOptional, IsString, IsNumber, Min, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMainProductDto {
  @ApiPropertyOptional({ description: 'Product name' })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiPropertyOptional({ description: 'Product short description' })
  @IsOptional()
  @IsString({ message: 'Short description must be a string' })
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  price?: number;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsOptional()
  @IsString({ message: 'Image must be a string' })
  image?: string;

  @ApiPropertyOptional({ description: 'Vendor ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Store ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Store ID must be a valid UUID' })
  storeId?: string;

  @ApiPropertyOptional({ description: 'Product active status' })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

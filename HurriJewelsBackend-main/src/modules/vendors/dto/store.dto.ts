import { 
  IsString, 
  IsOptional, 
  IsNotEmpty, 
  IsBoolean,
  IsUrl,
  IsEmail,
  MaxLength,
  MinLength,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
  @ApiProperty({ 
    description: 'Store name',
    example: 'My Jewelry Store',
    minLength: 2,
    maxLength: 100
  })
  @IsNotEmpty({ message: 'Store name is required' })
  @IsString({ message: 'Store name must be a string' })
  @MinLength(2, { message: 'Store name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Store name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ 
    description: 'Store slug (URL-friendly name)',
    example: 'my-jewelry-store',
    pattern: '^[a-z0-9-]+$'
  })
  @IsNotEmpty({ message: 'Store slug is required' })
  @IsString({ message: 'Store slug must be a string' })
  @Matches(/^[a-z0-9-]+$/, { 
    message: 'Store slug can only contain lowercase letters, numbers, and hyphens' 
  })
  @MinLength(2, { message: 'Store slug must be at least 2 characters long' })
  @MaxLength(50, { message: 'Store slug must not exceed 50 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  slug: string;

  @ApiPropertyOptional({ 
    description: 'Store description',
    example: 'Premium jewelry store offering unique handmade pieces',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Store description must be a string' })
  @MaxLength(1000, { message: 'Store description must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Store logo URL',
    example: 'https://example.com/logo.png'
  })
  @IsOptional()
  @IsString({ message: 'Store logo must be a string' })
  @IsUrl({}, { message: 'Store logo must be a valid URL' })
  @MaxLength(500, { message: 'Store logo URL must not exceed 500 characters' })
  logo?: string;

  @ApiPropertyOptional({ 
    description: 'Store banner URL',
    example: 'https://example.com/banner.jpg'
  })
  @IsOptional()
  @IsString({ message: 'Store banner must be a string' })
  @IsUrl({}, { message: 'Store banner must be a valid URL' })
  @MaxLength(500, { message: 'Store banner URL must not exceed 500 characters' })
  banner?: string;

  @ApiPropertyOptional({ 
    description: 'Store address',
    example: '123 Main Street, Suite 100',
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: 'Store address must be a string' })
  @MaxLength(200, { message: 'Store address must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Store city',
    example: 'New York',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Store city must be a string' })
  @MaxLength(50, { message: 'Store city must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Store state',
    example: 'NY',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Store state must be a string' })
  @MaxLength(50, { message: 'Store state must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  state?: string;

  @ApiPropertyOptional({ 
    description: 'Store country',
    example: 'United States',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Store country must be a string' })
  @MaxLength(50, { message: 'Store country must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  country?: string;

  @ApiPropertyOptional({ 
    description: 'Store postal code',
    example: '10001',
    maxLength: 20
  })
  @IsOptional()
  @IsString({ message: 'Store postal code must be a string' })
  @MaxLength(20, { message: 'Store postal code must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim())
  postalCode?: string;

  @ApiPropertyOptional({ 
    description: 'Store phone number',
    example: '+1-555-123-4567',
    maxLength: 20
  })
  @IsOptional()
  @IsString({ message: 'Store phone must be a string' })
  @MaxLength(20, { message: 'Store phone must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Store email address',
    example: 'contact@myjewelrystore.com'
  })
  @IsOptional()
  @IsString({ message: 'Store email must be a string' })
  @IsEmail({}, { message: 'Store email must be a valid email address' })
  @MaxLength(100, { message: 'Store email must not exceed 100 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Store website URL',
    example: 'https://myjewelrystore.com'
  })
  @IsOptional()
  @IsString({ message: 'Store website must be a string' })
  @IsUrl({}, { message: 'Store website must be a valid URL' })
  @MaxLength(200, { message: 'Store website URL must not exceed 200 characters' })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Social media links as JSON object',
    example: '{"facebook": "https://facebook.com/mystore", "instagram": "https://instagram.com/mystore"}'
  })
  @IsOptional()
  @IsString({ message: 'Social media must be a JSON string' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch {
        throw new Error('Invalid JSON format for social media');
      }
    }
    return value;
  })
  socialMedia?: string;

  @ApiPropertyOptional({ 
    description: 'Business hours as JSON object',
    example: '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "sunday": "closed"}'
  })
  @IsOptional()
  @IsString({ message: 'Business hours must be a JSON string' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch {
        throw new Error('Invalid JSON format for business hours');
      }
    }
    return value;
  })
  businessHours?: string;
}

export class UpdateStoreDto {
  @ApiPropertyOptional({ 
    description: 'Store name',
    example: 'My Updated Jewelry Store',
    minLength: 2,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Store name must be a string' })
  @MinLength(2, { message: 'Store name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Store name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Store description',
    example: 'Updated premium jewelry store offering unique handmade pieces',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Store description must be a string' })
  @MaxLength(1000, { message: 'Store description must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Store logo URL',
    example: 'https://example.com/new-logo.png'
  })
  @IsOptional()
  @IsString({ message: 'Store logo must be a string' })
  @IsUrl({}, { message: 'Store logo must be a valid URL' })
  @MaxLength(500, { message: 'Store logo URL must not exceed 500 characters' })
  logo?: string;

  @ApiPropertyOptional({ 
    description: 'Store banner URL',
    example: 'https://example.com/new-banner.jpg'
  })
  @IsOptional()
  @IsString({ message: 'Store banner must be a string' })
  @IsUrl({}, { message: 'Store banner must be a valid URL' })
  @MaxLength(500, { message: 'Store banner URL must not exceed 500 characters' })
  banner?: string;

  @ApiPropertyOptional({ 
    description: 'Store address',
    example: '456 Updated Street, Suite 200',
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: 'Store address must be a string' })
  @MaxLength(200, { message: 'Store address must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Store city',
    example: 'Los Angeles',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Store city must be a string' })
  @MaxLength(50, { message: 'Store city must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Store state',
    example: 'CA',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Store state must be a string' })
  @MaxLength(50, { message: 'Store state must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  state?: string;

  @ApiPropertyOptional({ 
    description: 'Store country',
    example: 'United States',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Store country must be a string' })
  @MaxLength(50, { message: 'Store country must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  country?: string;

  @ApiPropertyOptional({ 
    description: 'Store postal code',
    example: '90210',
    maxLength: 20
  })
  @IsOptional()
  @IsString({ message: 'Store postal code must be a string' })
  @MaxLength(20, { message: 'Store postal code must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim())
  postalCode?: string;

  @ApiPropertyOptional({ 
    description: 'Store phone number',
    example: '+1-555-987-6543',
    maxLength: 20
  })
  @IsOptional()
  @IsString({ message: 'Store phone must be a string' })
  @MaxLength(20, { message: 'Store phone must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Store email address',
    example: 'info@myjewelrystore.com'
  })
  @IsOptional()
  @IsString({ message: 'Store email must be a string' })
  @IsEmail({}, { message: 'Store email must be a valid email address' })
  @MaxLength(100, { message: 'Store email must not exceed 100 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Store website URL',
    example: 'https://updatedjewelrystore.com'
  })
  @IsOptional()
  @IsString({ message: 'Store website must be a string' })
  @IsUrl({}, { message: 'Store website must be a valid URL' })
  @MaxLength(200, { message: 'Store website URL must not exceed 200 characters' })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Social media links as JSON object',
    example: '{"facebook": "https://facebook.com/updatedstore", "twitter": "https://twitter.com/updatedstore"}'
  })
  @IsOptional()
  @IsString({ message: 'Social media must be a JSON string' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch {
        throw new Error('Invalid JSON format for social media');
      }
    }
    return value;
  })
  socialMedia?: string;

  @ApiPropertyOptional({ 
    description: 'Business hours as JSON object',
    example: '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "sunday": "closed"}'
  })
  @IsOptional()
  @IsString({ message: 'Business hours must be a JSON string' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch {
        throw new Error('Invalid JSON format for business hours');
      }
    }
    return value;
  })
  businessHours?: string;

  @ApiPropertyOptional({ 
    description: 'Whether the store is active',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

export class StoreResponseDto {
  @ApiProperty({ 
    description: 'Store ID',
    example: 'clx1234567890'
  })
  id: string;

  @ApiProperty({ 
    description: 'Store name',
    example: 'My Jewelry Store'
  })
  name: string;

  @ApiProperty({ 
    description: 'Store slug',
    example: 'my-jewelry-store'
  })
  slug: string;

  @ApiPropertyOptional({ 
    description: 'Store description',
    example: 'Premium jewelry store offering unique handmade pieces'
  })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Store logo URL',
    example: 'https://example.com/logo.png'
  })
  logo?: string;

  @ApiPropertyOptional({ 
    description: 'Store banner URL',
    example: 'https://example.com/banner.jpg'
  })
  banner?: string;

  @ApiPropertyOptional({ 
    description: 'Store address',
    example: '123 Main Street, Suite 100'
  })
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Store city',
    example: 'New York'
  })
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Store state',
    example: 'NY'
  })
  state?: string;

  @ApiPropertyOptional({ 
    description: 'Store country',
    example: 'United States'
  })
  country?: string;

  @ApiPropertyOptional({ 
    description: 'Store postal code',
    example: '10001'
  })
  postalCode?: string;

  @ApiPropertyOptional({ 
    description: 'Store phone number',
    example: '+1-555-123-4567'
  })
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Store email address',
    example: 'contact@myjewelrystore.com'
  })
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Store website URL',
    example: 'https://myjewelrystore.com'
  })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Social media links',
    example: { facebook: 'https://facebook.com/mystore', instagram: 'https://instagram.com/mystore' }
  })
  socialMedia?: any;

  @ApiPropertyOptional({ 
    description: 'Business hours',
    example: { monday: '9:00-17:00', tuesday: '9:00-17:00', sunday: 'closed' }
  })
  businessHours?: any;

  @ApiProperty({ 
    description: 'Whether the store is active',
    example: true
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Store rating',
    example: 4.5
  })
  rating: number;

  @ApiProperty({ 
    description: 'Total number of products',
    example: 150
  })
  totalProducts: number;

  @ApiProperty({ 
    description: 'Total number of orders',
    example: 500
  })
  totalOrders: number;

  @ApiProperty({ 
    description: 'Total sales amount',
    example: 25000.50
  })
  totalSales: number;

  @ApiProperty({ 
    description: 'Store creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Store last update date',
    example: '2024-01-15T00:00:00.000Z'
  })
  updatedAt: Date;
}

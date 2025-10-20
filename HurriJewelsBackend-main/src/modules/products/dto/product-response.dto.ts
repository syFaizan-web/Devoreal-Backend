import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductMainResponseDto {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiPropertyOptional({ description: 'Main product image URL' })
  image?: string;

  @ApiPropertyOptional({ description: 'Short description for listing' })
  shortDescription?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  updatedBy?: string;
}

export class ProductFullResponseDto extends ProductMainResponseDto {
  @ApiPropertyOptional({ description: 'Basic tab data' })
  basic?: any;

  @ApiPropertyOptional({ description: 'Pricing tab data' })
  pricing?: any;

  @ApiPropertyOptional({ description: 'Media tab data' })
  media?: any;

  @ApiPropertyOptional({ description: 'SEO tab data' })
  seo?: any;

  @ApiPropertyOptional({ description: 'Association tab data' })
  association?: any;

  @ApiPropertyOptional({ description: 'Attributes & Tags tab data' })
  attributesTag?: any;

  @ApiPropertyOptional({ description: 'Variants tab data' })
  variants?: any;

  @ApiPropertyOptional({ description: 'Inventory tab data' })
  inventory?: any;

  @ApiPropertyOptional({ description: 'Reels tab data' })
  reels?: any;

  @ApiPropertyOptional({ description: 'Item Details tab data' })
  itemDetails?: any;

  @ApiPropertyOptional({ description: 'Shipping & Policies tab data' })
  shippingPolicies?: any;
}

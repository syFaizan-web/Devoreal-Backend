import { ApiProperty } from '@nestjs/swagger';

export class Product {
  @ApiProperty({ description: 'Unique product identifier' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product description', required: false })
  description?: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Compare price (original price)', required: false })
  comparePrice?: number;

  @ApiProperty({ description: 'Product cost', required: false })
  cost?: number;

  @ApiProperty({ description: 'Product SKU', required: false })
  sku?: string;

  @ApiProperty({ description: 'Product barcode', required: false })
  barcode?: string;

  @ApiProperty({ description: 'Product weight', required: false })
  weight?: number;

  @ApiProperty({ description: 'Product dimensions', required: false })
  dimensions?: string;

  @ApiProperty({ description: 'Stock quantity' })
  stockQuantity: number;

  @ApiProperty({ description: 'Minimum stock level' })
  minStockLevel: number;

  @ApiProperty({ description: 'Whether the product is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether the product is featured' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Vendor ID' })
  vendorId: string;

  @ApiProperty({ description: 'Category ID', required: false })
  categoryId?: string;

  @ApiProperty({ description: 'Product images URLs' })
  images: string[];

  @ApiProperty({ description: 'Product tags' })
  tags: string[];

  @ApiProperty({ description: 'Product attributes (JSON)', required: false })
  attributes?: any;

  @ApiProperty({ description: 'Product creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Product last update timestamp' })
  updatedAt: Date;

  // Relations
  @ApiProperty({ description: 'Vendor information', required: false })
  vendor?: {
    id: string;
    businessName: string;
    isVerified: boolean;
  };

  @ApiProperty({ description: 'Category information', required: false })
  category?: {
    id: string;
    name: string;
  };
}

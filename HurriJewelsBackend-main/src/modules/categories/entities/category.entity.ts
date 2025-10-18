import { ApiProperty } from '@nestjs/swagger';

export class Category {
  @ApiProperty({ description: 'Unique category identifier' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Category description', required: false })
  description?: string;

  @ApiProperty({ description: 'Category image URL', required: false })
  image?: string;

  @ApiProperty({ description: 'Whether the category is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Category creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Category last update timestamp' })
  updatedAt: Date;

  // Relations
  @ApiProperty({ description: 'Product in this category', required: false })
  products?: any[];
}

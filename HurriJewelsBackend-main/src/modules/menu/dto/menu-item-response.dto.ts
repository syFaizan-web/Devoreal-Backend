import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuItemResponseDto {
  @ApiProperty({ description: 'Menu item ID' })
  id: string;

  @ApiProperty({ description: 'Menu item name' })
  name: string;

  @ApiProperty({ description: 'Menu item slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Menu item description' })
  description?: string;

  @ApiProperty({ description: 'Menu item type' })
  type: string;

  @ApiPropertyOptional({ description: 'What this menu item links to (e.g., category)' })
  targetType?: string;

  @ApiPropertyOptional({ description: 'Linked entity ID (category/collection/signature piece) - always shows the linked ID regardless of targetType' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Linked collection ID if targetType=collection(s)' })
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Linked signature piece ID if targetType=signature/signature-pieces' })
  signaturePieceId?: string;

  @ApiPropertyOptional({ description: 'Parent menu item ID' })
  parentId?: string;

  @ApiProperty({ description: 'Menu item level' })
  level: number;

  @ApiProperty({ description: 'Countries where this menu item is available', type: [String] })
  country: string[];

  @ApiProperty({ description: 'Languages where this menu item is available', type: [String] })
  language: string[];

  @ApiProperty({ description: 'Tags for the menu item', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Whether the menu item is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Order of the menu item' })
  order: number;

  @ApiPropertyOptional({ description: 'Icon for the menu item' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Image path for the menu item' })
  image?: string;

  @ApiPropertyOptional({ description: 'Full image URL for the menu item' })
  imageUrl?: string;

  // Soft delete fields
  @ApiProperty({ description: 'Whether the menu item is deleted' })
  isDeleted: boolean;

  @ApiPropertyOptional({ description: 'User ID who deleted this menu item' })
  deletedBy?: string;

  @ApiPropertyOptional({ description: 'When the menu item was deleted' })
  deletedDateTime?: Date;

  // Auditing fields
  @ApiPropertyOptional({ description: 'User ID who last updated this menu item' })
  updatedBy?: string;

  @ApiPropertyOptional({ description: 'When the menu item was last updated by user' })
  updatedDateTime?: Date;

  // System timestamps
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class MenuItemTreeResponseDto extends MenuItemResponseDto {
  @ApiProperty({ description: 'Direct children of this menu item', type: [MenuItemTreeResponseDto] })
  children: MenuItemTreeResponseDto[];
}

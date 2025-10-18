import { IsString, IsOptional, IsArray, IsBoolean, IsInt, Min, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MenuItemType } from '../enums/menu-item-type.enum';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Menu item name', example: 'Dashboard' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Unique slug for the menu item', example: 'dashboard' })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ description: 'Menu item description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Menu item type', 
    example: 'page', 
    enum: MenuItemType,
    enumName: 'MenuItemType'
  })
  @IsEnum(MenuItemType, { message: 'Type must be one of: page, section, link, category' })
  type: MenuItemType;

  @ApiPropertyOptional({ description: 'If this is a linked item, what it links to', example: 'category' })
  @IsOptional()
  @IsString()
  targetType?: string; // category | collection | page | external

  @ApiPropertyOptional({ description: 'Linked category ID (required if targetType=category)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Linked collection ID (required if targetType=collection or collections)' })
  @IsOptional()
  @IsString()
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Linked signature piece ID (required if targetType=signature or signature-pieces)' })
  @IsOptional()
  @IsString()
  signaturePieceId?: string;

  @ApiPropertyOptional({ description: 'Parent menu item ID' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' ? null : value)
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Menu item level', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({ description: 'Countries where this menu item is available', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  country?: string[];

  @ApiPropertyOptional({ description: 'Languages where this menu item is available', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  language?: string[];

  @ApiPropertyOptional({ description: 'Tags for the menu item', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether the menu item is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Order of the menu item', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ description: 'Icon for the menu item' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Image for the menu item' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;
}

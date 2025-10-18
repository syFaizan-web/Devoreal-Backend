import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray, IsEnum, IsBoolean, MaxLength, MinLength, IsObject, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ArticleStatusEnum { DRAFT = 'DRAFT', PUBLISHED = 'PUBLISHED', ARCHIVED = 'ARCHIVED' }

// RTE Content Block Types
export enum RTEBlockType {
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  IMAGE = 'image',
  VIDEO = 'video',
  LIST = 'list',
  QUOTE = 'quote',
  TABLE = 'table',
  LINK = 'link'
}

// RTE Content Block Interface
export class RTEBlock {
  @ApiProperty({ description: 'Block type', enum: RTEBlockType })
  @IsEnum(RTEBlockType)
  type: RTEBlockType;

  @ApiProperty({ description: 'Block content/data' })
  @IsObject()
  data: any;

  @ApiProperty({ description: 'Block ID for referencing' })
  @IsString()
  @IsOptional()
  id?: string;
}

// RTE Content Structure
export class RTEContent {
  @ApiProperty({ description: 'Array of content blocks', type: [RTEBlock] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RTEBlock)
  blocks: RTEBlock[];

  @ApiProperty({ description: 'Content version for tracking changes' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ description: 'Last modified timestamp' })
  @IsString()
  @IsOptional()
  lastModified?: string;
}

// Main Article Data Structure
export class ArticleData {
  @ApiProperty({ description: 'Article title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Article slug (SEO friendly)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  slug: string;

  @ApiProperty({ description: 'Article summary/excerpt' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  summary: string;

  @ApiProperty({ description: 'Article category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Article tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: 'Article author' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ description: 'Article vendor/source' })
  @IsString()
  @IsOptional()
  vendor?: string;

  @ApiProperty({ description: 'SEO title' })
  @IsString()
  @IsOptional()
  @MaxLength(70)
  seoTitle?: string;

  @ApiProperty({ description: 'Meta description' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @ApiProperty({ description: 'Featured image URL' })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiProperty({ description: 'Publishing status', enum: ArticleStatusEnum })
  @IsEnum(ArticleStatusEnum)
  @IsOptional()
  publishingStatus?: ArticleStatusEnum;
}

// Complete RTE Article Structure
export class RTEArticleStructure {
  @ApiProperty({ description: 'Article metadata and basic info', type: ArticleData })
  @ValidateNested()
  @Type(() => ArticleData)
  articleData: ArticleData;

  @ApiProperty({ description: 'Rich text editor content blocks', type: RTEContent })
  @ValidateNested()
  @Type(() => RTEContent)
  editorData: RTEContent;
}

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title', example: 'The Future of E-commerce' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Article slug (SEO friendly, auto-generated from title if omitted)', required: false, example: 'future-of-ecommerce' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  slug?: string;

  @ApiProperty({ description: 'Short summary/excerpt of the article', example: 'A comprehensive look at the future trends in e-commerce...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  summary: string;

  @ApiProperty({ 
    description: 'Rich Text Editor content blocks', 
    type: RTEContent,
    example: {
      blocks: [
        {
          type: 'heading',
          data: { text: 'Introduction', level: 2 },
          id: 'heading-1'
        },
        {
          type: 'paragraph',
          data: { text: 'This is a paragraph with rich content...' },
          id: 'paragraph-1'
        },
        {
          type: 'image',
          data: { 
            src: 'https://example.com/image.jpg', 
            alt: 'Sample image',
            caption: 'Image caption'
          },
          id: 'image-1'
        }
      ],
      version: '1.0',
      lastModified: '2024-01-01T00:00:00Z'
    }
  })
  @ValidateNested()
  @Type(() => RTEContent)
  content: RTEContent;

  @ApiProperty({ description: 'Article cover image URL', required: false })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ description: 'Cover image file upload', type: 'string', format: 'binary', required: false })
  @IsOptional()
  coverFile?: any;

  @ApiProperty({ description: 'Cover image alt text (for accessibility/SEO)', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  coverAlt?: string;

  @ApiProperty({ description: 'Estimated reading time in minutes', example: 5 })
  @IsInt()
  @Min(1)
  readMinutes: number;

  @ApiProperty({ description: 'Whether article is featured', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ description: 'Article status', enum: ArticleStatusEnum, required: false, default: ArticleStatusEnum.DRAFT })
  @IsEnum(ArticleStatusEnum)
  @IsOptional()
  status?: ArticleStatusEnum;

  @ApiProperty({ description: 'Whether article is active/visible', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // SEO fields
  @ApiProperty({ description: 'SEO meta title', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(70)
  metaTitle?: string;

  @ApiProperty({ description: 'SEO meta description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @ApiProperty({ description: 'SEO meta image URL', required: false })
  @IsString()
  @IsOptional()
  metaImageUrl?: string;

  @ApiProperty({ description: 'Content language (IETF tag)', example: 'en', required: false, default: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ description: 'Array of category IDs', example: ['cat1', 'cat2'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ description: 'Array of category slugs (alternative to categoryIds)', example: ['jewelry-trends', 'e-commerce'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categorySlugs?: string[];

  @ApiProperty({ description: 'Array of tag IDs', example: ['tag1', 'tag2'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiProperty({ description: 'Array of tag slugs (alternative to tagIds)', example: ['diamond', 'fashion'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagSlugs?: string[];
}
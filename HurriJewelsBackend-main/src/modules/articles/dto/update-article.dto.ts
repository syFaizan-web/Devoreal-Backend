import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsArray, IsEnum, IsBoolean, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ArticleStatusEnum, RTEContent } from './create-article.dto';

export class UpdateArticleDto {
  @ApiProperty({ description: 'Article title', required: false })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: 'Article slug (SEO friendly)', required: false })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  slug?: string;

  @ApiProperty({ description: 'Short summary/excerpt of the article', required: false })
  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ 
    description: 'Rich Text Editor content blocks (optional for updates)', 
    type: RTEContent,
    required: false
  })
  @ValidateNested()
  @Type(() => RTEContent)
  @IsOptional()
  content?: RTEContent;

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

  @ApiProperty({ description: 'Estimated reading time in minutes', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  readMinutes?: number;

  @ApiProperty({ description: 'Whether article is featured', required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ description: 'Article status', enum: ArticleStatusEnum, required: false })
  @IsEnum(ArticleStatusEnum)
  @IsOptional()
  status?: ArticleStatusEnum;

  @ApiProperty({ description: 'Whether article is active/visible', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Publication date (server-managed, optional override)', required: false })
  @IsOptional()
  publishedAt?: Date;

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

  @ApiProperty({ description: 'Content language (IETF tag)', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ description: 'Array of category IDs', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ description: 'Array of category slugs (alternative to categoryIds)', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categorySlugs?: string[];

  @ApiProperty({ description: 'Array of tag IDs', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiProperty({ description: 'Array of tag slugs (alternative to tagIds)', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagSlugs?: string[];
}
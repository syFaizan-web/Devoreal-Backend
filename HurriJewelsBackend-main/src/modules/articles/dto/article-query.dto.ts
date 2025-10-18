import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ArticleStatusEnum } from './create-article.dto';

export class ArticleQueryDto {
  @ApiProperty({ description: 'Search query', required: false })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ description: 'Category slug filter', required: false })
  @IsString()
  @IsOptional()
  categorySlug?: string;

  @ApiProperty({ description: 'Tag slug filter', required: false })
  @IsString()
  @IsOptional()
  tagSlug?: string;

  @ApiProperty({ description: 'Sort order', enum: ['latest', 'popular', 'featured'], required: false, default: 'latest' })
  @IsString()
  @IsOptional()
  sort?: 'latest' | 'popular' | 'featured';

  @ApiProperty({ description: 'Minimum read time in minutes', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  minRead?: number;

  @ApiProperty({ description: 'Page number for pagination', required: false, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: 'Article status filter', enum: ArticleStatusEnum, required: false })
  @IsEnum(ArticleStatusEnum)
  @IsOptional()
  status?: ArticleStatusEnum;
}


import { ApiProperty } from '@nestjs/swagger';

export class SearchResultItem {
  @ApiProperty({ description: 'Item ID' })
  id: string;

  @ApiProperty({ description: 'Item title' })
  title: string;

  @ApiProperty({ description: 'Item slug' })
  slug: string;

  @ApiProperty({ description: 'Item expert/description', required: false })
  excerpt?: string;

  @ApiProperty({ description: 'Item type', enum: ['article', 'category', 'tag'] })
  type: 'article' | 'category' | 'tag';

  @ApiProperty({ description: 'Published date', required: false })
  publishedAt?: Date;

  @ApiProperty({ description: 'Author name', required: false })
  authorName?: string;
}

export class SearchResponse {
  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Search results', type: [SearchResultItem] })
  results: SearchResultItem[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;

  @ApiProperty({ description: 'Search took time in ms' })
  took: number;
}


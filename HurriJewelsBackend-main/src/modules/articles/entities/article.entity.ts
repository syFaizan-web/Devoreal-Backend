import { ApiProperty } from '@nestjs/swagger';
import { ArticleStatusEnum, RTEContent } from '../dto/create-article.dto';

export class AuthorResponse {
  @ApiProperty({ description: 'Author ID' })
  id: string;

  @ApiProperty({ description: 'Author display name' })
  displayName: string;

  @ApiProperty({ description: 'Author bio', required: false })
  bio?: string;

  @ApiProperty({ description: 'Author experience description', required: false })
  experience?: string;

  @ApiProperty({ description: 'Author avatar URL', required: false })
  avatarUrl?: string;

  @ApiProperty({ description: 'Linked user ID', required: false })
  userId?: string;
}

export class ArticleCategoryResponse {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Category slug' })
  slug: string;

  @ApiProperty({ description: 'Category description', required: false })
  description?: string;
}

export class ArticleTagResponse {
  @ApiProperty({ description: 'Tag ID' })
  id: string;

  @ApiProperty({ description: 'Tag name' })
  name: string;

  @ApiProperty({ description: 'Tag slug' })
  slug: string;
}

export class ArticleResponse {
  @ApiProperty({ description: 'Article ID' })
  id: string;

  @ApiProperty({ description: 'Article slug' })
  slug: string;

  @ApiProperty({ description: 'Article title' })
  title: string;

  @ApiProperty({ description: 'Short summary/excerpt of the article', required: false })
  summary?: string;

  @ApiProperty({ 
    description: 'Rich Text Editor content blocks with enhanced support for multiple media uploads',
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
          data: { text: 'Diamonds are formed deep within...' },
          id: 'paragraph-1'
        },
        {
          type: 'image',
          data: {
            src: '/uploads/article-content/image1.jpg',
            alt: 'Diamond formation process',
            caption: 'How diamonds are formed deep within the Earth',
            width: '100%',
            height: 'auto',
            alignment: 'center'
          },
          id: 'image-1'
        },
        {
          type: 'video',
          data: {
            src: '/uploads/article-content/video1.mp4',
            poster: '/uploads/article-content/poster1.jpg',
            caption: 'Diamond mining process',
            autoplay: false,
            controls: true,
            width: '100%',
            height: '400px'
          },
          id: 'video-1'
        },
        {
          type: 'image-gallery',
          data: {
            images: [
              '/uploads/article-content/gallery1.jpg',
              '/uploads/article-content/gallery2.jpg',
              '/uploads/article-content/gallery3.jpg'
            ],
            layout: 'grid',
            columns: 3
          },
          id: 'gallery-1'
        }
      ],
      version: '1.0',
      lastModified: '2024-01-01T00:00:00Z'
    }
  })
  content: RTEContent;

  @ApiProperty({ description: 'Article cover URL', required: false })
  coverUrl?: string;
  @ApiProperty({ description: 'Cover image alt text', required: false })
  coverAlt?: string;

  @ApiProperty({ description: 'Author information' })
  author: AuthorResponse;

  @ApiProperty({ description: 'Reading time in minutes' })
  readMinutes: number;

  @ApiProperty({ description: 'View count' })
  viewsCount: number;

  @ApiProperty({ description: 'Like count' })
  likesCount: number;

  @ApiProperty({ description: 'Published date', required: false })
  publishedAt?: Date;

  @ApiProperty({ description: 'Article categories' })
  categories: ArticleCategoryResponse[];

  @ApiProperty({ description: 'Article tags' })
  tags: ArticleTagResponse[];

  @ApiProperty({ description: 'Is featured article' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Article status', enum: ArticleStatusEnum })
  status: ArticleStatusEnum;

  @ApiProperty({ description: 'SEO meta title', required: false })
  metaTitle?: string;
  @ApiProperty({ description: 'SEO meta description', required: false })
  metaDescription?: string;
  @ApiProperty({ description: 'SEO meta image URL', required: false })
  metaImageUrl?: string;
  @ApiProperty({ description: 'Content language', required: false })
  language?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}

export class PaginatedArticleResponse {
  @ApiProperty({ description: 'Array of articles', type: [ArticleResponse] })
  data: ArticleResponse[];

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
}


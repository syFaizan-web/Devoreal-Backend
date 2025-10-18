import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { SearchQueryDto } from './dto/search.dto';
import { SearchResponse, SearchResultItem } from './entities/search.entity';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const startTime = Date.now();
    const { q, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    try {
      // Search articles
      const articles = await this.prisma.article.findMany({
        where: ({
          AND: [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                // Cast to any to support projects where generated types still expose `excerpt`
                { expert: { contains: q, mode: 'insensitive' } } as any,
                { content: { contains: q, mode: 'insensitive' } },
              ],
            },
            {
              isActive: true,
              isDeleted: false,
              status: 'PUBLISHED',
            },
          ],
        } as any),
        include: {
          author: true,
        },
        orderBy: [
          { isFeatured: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip,
        take: Math.floor(limit * 0.7), // 70% of results are articles
      });

      // Search categories
      const categories = await this.prisma.articleCategory.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            {
              isActive: true,
              isDeleted: false,
            },
          ],
        },
        orderBy: { name: 'asc' },
        take: Math.floor(limit * 0.2), // 20% of results are categories
      });

      // Search tags
      const tags = await this.prisma.articleTag.findMany({
        where: {
          AND: [
            {
              name: { contains: q, mode: 'insensitive' },
            },
            {
              isActive: true,
              isDeleted: false,
            },
          ],
        },
        orderBy: { name: 'asc' },
        take: Math.floor(limit * 0.1), // 10% of results are tags
      });

      // Combine and sort results
      const results: SearchResultItem[] = [
        ...articles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: (article as any).expert ?? (article as any).excerpt,
          type: 'article' as const,
          publishedAt: article.publishedAt,
          authorName: (article as any).author?.displayName,
        })),
        ...categories.map(category => ({
          id: category.id,
          title: category.name,
          slug: category.slug,
          excerpt: category.description,
          type: 'category' as const,
        })),
        ...tags.map(tag => ({
          id: tag.id,
          title: tag.name,
          slug: tag.slug,
          type: 'tag' as const,
        })),
      ];

      // Get total count for pagination
      const [totalArticles, totalCategories, totalTags] = await Promise.all([
        this.prisma.article.count({
          where: ({
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { expert: { contains: q, mode: 'insensitive' } } as any,
                  { content: { contains: q, mode: 'insensitive' } },
                ],
              },
              {
                isActive: true,
                isDeleted: false,
                status: 'PUBLISHED',
              },
            ],
          } as any),
        }),
        this.prisma.articleCategory.count({
          where: {
            AND: [
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              },
              {
                isActive: true,
                isDeleted: false,
              },
            ],
          },
        }),
        this.prisma.articleTag.count({
          where: {
            AND: [
              {
                name: { contains: q, mode: 'insensitive' },
              },
              {
                isActive: true,
                isDeleted: false,
              },
            ],
          },
        }),
      ]);

      const total = totalArticles + totalCategories + totalTags;
      const totalPages = Math.ceil(total / limit);
      const took = Date.now() - startTime;

      return {
        query: q,
        results,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        took,
      };
    } catch (error) {
      this.logger.error('Error performing search:', error);
      throw error;
    }
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      const suggestions: string[] = [];

      // Get article title suggestions
      const articleTitles = await this.prisma.article.findMany({
        where: {
          AND: [
            {
              title: { contains: query, mode: 'insensitive' },
            },
            {
              isActive: true,
              isDeleted: false,
              status: 'PUBLISHED',
            },
          ],
        },
        select: { title: true },
        take: Math.floor(limit * 0.6),
      });

      // Get category name suggestions
      const categoryNames = await this.prisma.articleCategory.findMany({
        where: {
          AND: [
            {
              name: { contains: query, mode: 'insensitive' },
            },
            {
              isActive: true,
              isDeleted: false,
            },
          ],
        },
        select: { name: true },
        take: Math.floor(limit * 0.3),
      });

      // Get tag name suggestions
      const tagNames = await this.prisma.articleTag.findMany({
        where: {
          AND: [
            {
              name: { contains: query, mode: 'insensitive' },
            },
            {
              isActive: true,
              isDeleted: false,
            },
          ],
        },
        select: { name: true },
        take: Math.floor(limit * 0.1),
      });

      suggestions.push(
        ...articleTitles.map(article => article.title),
        ...categoryNames.map(category => category.name),
        ...tagNames.map(tag => tag.name),
      );

      // Remove duplicates and limit results
      return [...new Set(suggestions)].slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting search suggestions:', error);
      return [];
    }
  }
}


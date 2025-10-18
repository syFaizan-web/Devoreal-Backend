import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { ViewEventDto, LikeDto, BookmarkDto, NewsletterSubscribeDto, EngagementEntityType } from './dto/engagement.dto';
import { EntityType } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async trackView(viewEventDto: ViewEventDto, ipHash: string, userId?: string): Promise<void> {
    try {
      const { entityType, entityId } = viewEventDto;

      // Check if entity exists
      if (entityType === 'ARTICLE' as any) {
        const article = await this.prisma.article.findUnique({
          where: { id: entityId },
        });

        if (!article || !article.isActive || article.isDeleted) {
          throw new NotFoundException('Article not found');
        }
      }

      // Check if view already exists for this IP in the last 30 minutes
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

      const existingView = await this.prisma.viewEvent.findFirst({
        where: {
          entityType,
          entityId,
          ipHash,
          createdAt: { gte: thirtyMinutesAgo },
          isActive: true,
          isDeleted: false,
        },
      });

      if (!existingView) {
        // Create new view event
        await this.prisma.viewEvent.create({
          data: {
            entityType,
            entityId,
            ipHash,
            userId,
          },
        });

        // Increment view count for articles
        if (entityType === 'ARTICLE' as any) {
          await this.prisma.article.update({
            where: { id: entityId },
            data: {
              viewsCount: { increment: 1 },
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error tracking view:', error);
      throw error;
    }
  }

  async toggleLike(likeDto: LikeDto, userId?: string): Promise<{ liked: boolean; likesCount: number }> {
    try {
      const { entityType, entityId } = likeDto;

      // Check if entity exists
      if (entityType === 'ARTICLE' as any) {
        const article = await this.prisma.article.findUnique({
          where: { id: entityId },
        });

        if (!article || !article.isActive || article.isDeleted) {
          throw new NotFoundException('Article not found');
        }
      }

      // Check if like already exists
      const existingLike = userId
        ? await this.prisma.like.findUnique({
            where: {
              userId_entityType_entityId: {
                userId,
                entityType,
                entityId,
              },
            },
          })
        : null;

      if (!userId) {
        throw new BadRequestException('Login required to like');
      }

      if (!existingLike) {
        // Create as active
        await this.prisma.like.create({
          data: {
            entityType,
            entityId,
            userId,
            createdBy: userId,
            isActive: true,
            isDeleted: false,
          },
        });
        if (entityType === EntityType.ARTICLE) {
          await this.prisma.article.update({
            where: { id: entityId },
            data: { likesCount: { increment: 1 } },
          });
        }
        return { liked: true, likesCount: await this.getLikesCount(entityType, entityId) };
      }

      if (existingLike.isActive && !existingLike.isDeleted) {
        // Deactivate (soft-unlike)
        await this.prisma.like.update({
          where: { id: existingLike.id },
          data: {
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            updatedAt: new Date(),
          },
        });
        if (entityType === 'ARTICLE' as any) {
          await this.prisma.article.update({
            where: { id: entityId },
            data: { likesCount: { decrement: 1 } },
          });
        }
        return { liked: false, likesCount: await this.getLikesCount(entityType, entityId) };
      }

      // Reactivate
      await this.prisma.like.update({
        where: { id: existingLike.id },
        data: {
          isActive: true,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
        },
      });
      if (entityType === EntityType.ARTICLE) {
        await this.prisma.article.update({
          where: { id: entityId },
          data: { likesCount: { increment: 1 } },
        });
      }
      return { liked: true, likesCount: await this.getLikesCount(entityType, entityId) };
    } catch (error) {
      this.logger.error('Error toggling like:', error);
      throw error;
    }
  }

  async toggleBookmark(bookmarkDto: BookmarkDto, userId: string): Promise<{ bookmarked: boolean }> {
    try {
      const { entityType, entityId } = bookmarkDto;

      // Check if entity exists
      if (entityType === EntityType.ARTICLE) {
        const article = await this.prisma.article.findUnique({
          where: { id: entityId },
        });

        if (!article || !article.isActive || article.isDeleted) {
          throw new NotFoundException('Article not found');
        }
      }

      // Check if bookmark already exists
      const existingBookmark = await this.prisma.bookmark.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType,
            entityId,
          },
        },
      });

      if (!existingBookmark) {
        // Create as active
        await this.prisma.bookmark.create({
          data: {
            entityType,
            entityId,
            userId,
            createdBy: userId,
            isActive: true,
            isDeleted: false,
          },
        });
        return { bookmarked: true };
      }

      if (existingBookmark.isActive && !existingBookmark.isDeleted) {
        // Deactivate (soft-unbookmark)
        await this.prisma.bookmark.update({
          where: { id: existingBookmark.id },
          data: {
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            updatedAt: new Date(),
          },
        });
        return { bookmarked: false };
      }

      // Reactivate
      await this.prisma.bookmark.update({
        where: { id: existingBookmark.id },
        data: {
          isActive: true,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
        },
      });
      return { bookmarked: true };
    } catch (error) {
      this.logger.error('Error toggling bookmark:', error);
      throw error;
    }
  }

  async subscribeToNewsletter(subscribeDto: NewsletterSubscribeDto): Promise<void> {
    try {
      const { email, source } = subscribeDto;

      // Check if email already exists
      const existingSubscription = await this.prisma.newsletterSignup.findUnique({
        where: { email },
      });

      if (existingSubscription) {
        if (existingSubscription.isDeleted) {
          // Reactivate subscription
          await this.prisma.newsletterSignup.update({
            where: { id: existingSubscription.id },
            data: {
              isDeleted: false,
              source,
              updatedAt: new Date(),
            },
          });
        }
        // If already active, do nothing
        return;
      }

      // Create new subscription
      await this.prisma.newsletterSignup.create({
        data: {
          email,
          source,
        },
      });
    } catch (error) {
      this.logger.error('Error subscribing to newsletter:', error);
      throw error;
    }
  }

  async getUserLikes(userId: string, entityType?: EngagementEntityType): Promise<any[]> {
    try {
      const where: any = {
        userId,
        isActive: true,
        isDeleted: false,
      };

      if (entityType) {
        where.entityType = entityType;
      }

      return this.prisma.like.findMany({
        where,
        include: {
          article: entityType === EntityType.ARTICLE ? {
            select: {
              id: true,
              title: true,
              slug: true,
              coverUrl: true,
              publishedAt: true,
            },
          } : false,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching user likes:', error);
      throw error;
    }
  }

  async getUserBookmarks(userId: string, entityType?: EngagementEntityType): Promise<any[]> {
    try {
      const where: any = {
        userId,
        isActive: true,
        isDeleted: false,
      };

      if (entityType) {
        where.entityType = entityType;
      }

      return this.prisma.bookmark.findMany({
        where,
        include: {
          article: entityType === EntityType.ARTICLE ? {
            select: {
              id: true,
              title: true,
              slug: true,
              coverUrl: true,
              publishedAt: true,
            },
          } : false,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching user bookmarks:', error);
      throw error;
    }
  }

  async getTrendingTopics(days: number = 14, limit: number = 10): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get trending categories
      const trendingCategories = await this.prisma.articleCategory.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          articles: {
            some: {
              article: {
                isActive: true,
                isDeleted: false,
                status: 'PUBLISHED',
                publishedAt: { gte: startDate },
              },
            },
          },
        },
        orderBy: [
          {
            articles: {
              _count: 'desc',
            },
          },
        ],
        take: limit,
      });

      // Get trending tags
      const trendingTags = await this.prisma.articleTag.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          articles: {
            some: {
              article: {
                isActive: true,
                isDeleted: false,
                status: 'PUBLISHED',
                publishedAt: { gte: startDate },
              },
            },
          },
        },
        orderBy: [
          {
            articles: {
              _count: 'desc',
            },
          },
        ],
        take: limit,
      });

      return {
        categories: await Promise.all(trendingCategories.map(async (cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: await this.prisma.articleOnCategories.count({
            where: {
              articleCategoryId: cat.id,
              article: {
                isActive: true,
                isDeleted: false,
                status: 'PUBLISHED',
                publishedAt: { gte: startDate },
              },
            },
          }),
        }))),
        tags: await Promise.all(trendingTags.map(async (tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          count: await this.prisma.articleOnTags.count({
            where: {
              articleTagId: tag.id,
              article: {
                isActive: true,
                isDeleted: false,
                status: 'PUBLISHED',
                publishedAt: { gte: startDate },
              },
            },
          }),
        }))),
      };
    } catch (error) {
      this.logger.error('Error fetching trending topics:', error);
      throw error;
    }
  }

  private async getLikesCount(entityType: EntityType, entityId: string): Promise<number> {
    if (entityType === EntityType.ARTICLE) {
      const article = await this.prisma.article.findUnique({
        where: { id: entityId },
        select: { likesCount: true },
      });
      return article?.likesCount || 0;
    }
    return 0;
  }

  generateIpHash(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }
}


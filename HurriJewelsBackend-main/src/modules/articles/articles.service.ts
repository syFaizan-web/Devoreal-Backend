import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as util from 'util';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto } from './dto/article-query.dto';
import { ArticleResponse, PaginatedArticleResponse } from './entities/article.entity';
import { ArticleStatusEnum } from './dto/create-article.dto';
import { createHash } from 'crypto';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createArticleDto: CreateArticleDto, userId: string): Promise<ArticleResponse> {
    
    // Helper to detect circular structures
    const hasCircular = (obj: any, seen = new WeakSet()): boolean => {
      if (obj && typeof obj === 'object') {
        if (seen.has(obj)) return true;
        seen.add(obj);
        for (const k of Object.keys(obj)) {
          if (hasCircular((obj as any)[k], seen)) return true;
        }
      }
      return false;
    };

    try {
      // 1) Slug handling
      let slug: string;
      if (createArticleDto.slug == null) {
        slug = this.generateSlug(createArticleDto.title);
      } else if (typeof createArticleDto.slug === 'string') {
        slug = this.generateSlug(createArticleDto.slug);
      } else {
        const stringSlug = String(createArticleDto.slug).trim();
        slug = stringSlug ? this.generateSlug(stringSlug) : this.generateSlug(createArticleDto.title);
      }

      // 2) Ensure slug uniqueness
      const existingArticle = await this.prisma.article.findUnique({ where: { slug } });
      if (existingArticle) throw new BadRequestException('An article with this title already exists');

      // 3) Determine author to connect: prefer explicit authorId in payload; else use current user
      const explicitAuthorId = (createArticleDto as any)?.authorId as string | undefined;
      let authorConnectId: string | undefined = explicitAuthorId;
      if (!authorConnectId) {
        const foundAuthor = await this.prisma.author.findFirst({ where: { userId } });
        if (foundAuthor) {
          authorConnectId = foundAuthor.id;
        } else {
          // create minimal author for user to own the article
          const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, avatar: true } });
          if (!user) throw new NotFoundException('User not found');
          const newAuthor = await this.prisma.author.create({
            data: { userId, displayName: user.fullName || 'Anonymous', avatarUrl: user.avatar, createdBy: userId },
          });
          authorConnectId = newAuthor.id;
        }
      }

      // 4) Build sanitized payload for Prisma
      const data: any = {
        title: createArticleDto.title,
        slug,
        summary: createArticleDto.summary,
        content: createArticleDto.content, // Store the RTE JSON structure
        coverUrl: createArticleDto.coverUrl,
        coverAlt: createArticleDto.coverAlt,
        readMinutes: createArticleDto.readMinutes,
        isFeatured: createArticleDto.isFeatured ?? false,
        status: (createArticleDto.status as any) ?? 'DRAFT',
        metaTitle: createArticleDto.metaTitle,
        metaDescription: createArticleDto.metaDescription,
        metaImageUrl: createArticleDto.metaImageUrl ?? createArticleDto.coverUrl,
        language: createArticleDto.language,
        isActive: (createArticleDto as any).isActive ?? true,
        author: { connect: { id: authorConnectId } },
        createdBy: userId,
      };

      // 5) Guard against circular structures
      if (hasCircular(data)) {
        throw new BadRequestException('Circular structure detected in request payload');
      }

      // 6) Create article with minimal includes to avoid recursion
      const article = await this.prisma.article.create({
        data,
        include: {
          author: { select: { id: true, displayName: true, bio: true, avatarUrl: true, userId: true } },
          categories: { include: { category: { select: { id: true, name: true, slug: true, description: true } } } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      });

      // 7) Link categories and tags after create
      if (createArticleDto.categorySlugs?.length) {
        const cats = await this.prisma.articleCategory.findMany({ where: { slug: { in: createArticleDto.categorySlugs } }, select: { id: true } });
        createArticleDto.categoryIds = [...(createArticleDto.categoryIds ?? []), ...cats.map(c => c.id)];
      }
      if (createArticleDto.categoryIds?.length) {
        const uniqueCategoryIds = Array.from(new Set(createArticleDto.categoryIds.filter(Boolean)));
        if (uniqueCategoryIds.length) {
          await this.prisma.articleOnCategories.createMany({
            data: uniqueCategoryIds.map(categoryId => ({ articleId: article.id, articleCategoryId: categoryId, createdBy: userId })),
            skipDuplicates: true,
          }).catch(() => void 0);
        }
      }

      if (createArticleDto.tagSlugs?.length) {
        const tags = await this.prisma.articleTag.findMany({ where: { slug: { in: createArticleDto.tagSlugs } }, select: { id: true } });
        createArticleDto.tagIds = [...(createArticleDto.tagIds ?? []), ...tags.map(t => t.id)];
      }
      if (createArticleDto.tagIds?.length) {
        const uniqueTagIds = Array.from(new Set(createArticleDto.tagIds.filter(Boolean)));
        if (uniqueTagIds.length) {
          await this.prisma.articleOnTags.createMany({
            data: uniqueTagIds.map(tagId => ({ articleId: article.id, articleTagId: tagId, createdBy: userId })),
            skipDuplicates: true,
          }).catch(() => void 0);
        }
      }

      // 8) Reload with relations so the response shows linked categories/tags
      const updated = await this.prisma.article.findUnique({
        where: { id: article.id },
        include: {
          author: { select: { id: true, displayName: true, bio: true, avatarUrl: true, userId: true } },
          categories: { include: { category: { select: { id: true, name: true, slug: true, description: true } } } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      });
      return this.mapToResponse(updated);
    } catch (error) {
      const safePayload = {
        ...createArticleDto,
        coverFile: undefined, // ensure no buffers/functions
      } as any;
      this.logger.error(`Error creating article with payload: ${util.inspect(safePayload, { depth: 4 })}`);
      this.logger.error(error?.message || error);
      throw error;
    }
  }

  async findAll(query: ArticleQueryDto): Promise<PaginatedArticleResponse> {
    try {
      const {
        q,
        categorySlug,
        tagSlug,
        sort = 'latest',
        minRead,
        page = 1,
        limit = 10,
        status = ArticleStatusEnum.PUBLISHED,
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        isActive: true,
        isDeleted: false,
        status,
      };

      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { expert: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (minRead) {
        where.readMinutes = { gte: minRead };
      }

      if (categorySlug) {
        where.categories = {
          some: {
            category: {
              slug: categorySlug,
              isActive: true,
              isDeleted: false,
            },
          },
        };
      }

      if (tagSlug) {
        where.tags = {
          some: {
            tag: {
              slug: tagSlug,
              isActive: true,
              isDeleted: false,
            },
          },
        };
      }

      // Build orderBy clause
      let orderBy: any = {};
      switch (sort) {
        case 'popular':
          orderBy = { viewsCount: 'desc' };
          break;
        case 'featured':
          orderBy = [{ isFeatured: 'desc' }, { publishedAt: 'desc' }];
          break;
        case 'latest':
        default:
          orderBy = { publishedAt: 'desc' };
          break;
      }

      const [articles, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            author: true,
            categories: {
              include: {
                category: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        }),
        this.prisma.article.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: articles.map(article => this.mapToResponse(article)),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error('Error fetching articles:', error);
      throw error;
    }
  }

  async findOne(slug: string): Promise<ArticleResponse> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { slug },
        include: {
          author: true,
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      if (!article || !article.isActive || article.isDeleted) {
        throw new NotFoundException('Article not found');
      }

      return this.mapToResponse(article);
    } catch (error) {
      this.logger.error('Error fetching article:', error);
      throw error;
    }
  }

  async findFeatured(limit: number = 5): Promise<ArticleResponse[]> {
    try {
      const articles = await this.prisma.article.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          isFeatured: true,
          status: 'PUBLISHED',
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        include: {
          author: true,
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      return articles.map(article => this.mapToResponse(article));
    } catch (error) {
      this.logger.error('Error fetching featured articles:', error);
      throw error;
    }
  }

  async findRecent(limit: number = 5): Promise<ArticleResponse[]> {
    try {
      const articles = await this.prisma.article.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          status: 'PUBLISHED',
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        include: {
          author: true,
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      return articles.map(article => this.mapToResponse(article));
    } catch (error) {
      this.logger.error('Error fetching recent articles:', error);
      throw error;
    }
  }

  async findPopular(limit: number = 5): Promise<ArticleResponse[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const articles = await this.prisma.article.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          status: 'PUBLISHED',
          publishedAt: { gte: thirtyDaysAgo },
        },
        orderBy: [
          { viewsCount: 'desc' },
          { likesCount: 'desc' },
        ],
        take: limit,
        include: {
          author: true,
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      return articles.map(article => this.mapToResponse(article));
    } catch (error) {
      this.logger.error('Error fetching popular articles:', error);
      throw error;
    }
  }

  async update(id: string, updateArticleDto: UpdateArticleDto, userId: string, userRole: string): Promise<ArticleResponse> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id },
        include: { author: true },
      });

      if (!article || !article.isActive || article.isDeleted) {
        throw new NotFoundException('Article not found');
      }

      // Check permissions
      if (!this.canEditArticle(article, userId, userRole)) {
        throw new ForbiddenException('You do not have permission to edit this article');
      }

      const updateData: any = {
        title: updateArticleDto.title,
        slug: updateArticleDto.slug,
        summary: updateArticleDto.summary,
        content: updateArticleDto.content, // Store the RTE JSON structure
        coverUrl: updateArticleDto.coverUrl,
        coverAlt: updateArticleDto.coverAlt,
        readMinutes: updateArticleDto.readMinutes,
        isFeatured: updateArticleDto.isFeatured,
        isActive: updateArticleDto.isActive,
        status: updateArticleDto.status as any,
        publishedAt: updateArticleDto.publishedAt,
        metaTitle: updateArticleDto.metaTitle,
        metaDescription: updateArticleDto.metaDescription,
        metaImageUrl: updateArticleDto.metaImageUrl,
        language: updateArticleDto.language,
        // Store role in updatedBy for audit visibility, e.g. "ADMIN:cmg..."
        updatedBy: userRole ? `${userRole}:${userId}` : userId,
      };

      // Generate new slug if title is being updated
      if (updateArticleDto.title && updateArticleDto.title !== article.title) {
        const newSlug = this.generateSlug(updateArticleDto.title);
        const existingArticle = await this.prisma.article.findUnique({
          where: { slug: newSlug },
        });

        if (existingArticle && existingArticle.id !== id) {
          throw new BadRequestException('An article with this title already exists');
        }
        updateData.slug = newSlug;
      }

      // Handle status change to published
      if (updateArticleDto.status === ArticleStatusEnum.PUBLISHED && article.status !== ArticleStatusEnum.PUBLISHED) {
        updateData.publishedAt = new Date();
      }

      const updatedArticle = await this.prisma.article.update({
        where: { id },
        data: updateData,
        include: {
          author: true,
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Update categories if provided
      if (updateArticleDto.categoryIds !== undefined) {
        await this.prisma.articleOnCategories.deleteMany({
          where: { articleId: id },
        });

        if (updateArticleDto.categoryIds.length > 0) {
          await this.prisma.articleOnCategories.createMany({
            data: updateArticleDto.categoryIds.map(categoryId => ({
              articleId: id,
              articleCategoryId: categoryId,
              createdBy: userId,
            })),
          });
        }
      }

      // Update tags if provided
      if (updateArticleDto.tagIds !== undefined) {
        await this.prisma.articleOnTags.deleteMany({
          where: { articleId: id },
        });

        if (updateArticleDto.tagIds.length > 0) {
          await this.prisma.articleOnTags.createMany({
            data: updateArticleDto.tagIds.map(tagId => ({
              articleId: id,
              articleTagId: tagId,
              createdBy: userId,
            })),
          });
        }
      }

      return this.mapToResponse(updatedArticle);
    } catch (error) {
      this.logger.error('Error updating article:', error);
      throw error;
    }
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id },
        include: { author: { select: { userId: true } } },
      });

      if (!article || !article.isActive || article.isDeleted) {
        throw new NotFoundException('Article not found');
      }

      // Check permissions (permit PUBLIC soft delete as requested)
      const isPublic = !userId || userRole === 'PUBLIC';
      if (!isPublic && !this.canEditArticle(article as any, userId, userRole)) {
        throw new ForbiddenException('You do not have permission to delete this article');
      }

      await this.prisma.article.update({
        where: { id },
        data: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
          deletedBy: userId || null,
        },
      });
    } catch (error) {
      this.logger.error('Error deleting article:', error);
      throw error;
    }
  }

  async removeHard(id: string): Promise<void> {
    try {
      const article = await this.prisma.article.findUnique({ where: { id } });
      if (!article) {
        throw new NotFoundException('Article not found');
      }
      await this.prisma.article.delete({ where: { id } });
    } catch (error) {
      this.logger.error('Error hard-deleting article:', error);
      throw error;
    }
  }

  async incrementViews(slug: string, ipHash: string, userId?: string): Promise<void> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { slug },
      });

      if (!article || !article.isActive || article.isDeleted) {
        return;
      }

      // Check if view already exists for this IP in the last 30 minutes
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

      const existingView = await this.prisma.viewEvent.findFirst({
        where: {
          entityType: 'ARTICLE',
          entityId: article.id,
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
            entityType: 'ARTICLE',
            entityId: article.id,
            ipHash,
            userId,
          },
        });

        // Increment view count
        await this.prisma.article.update({
          where: { id: article.id },
          data: {
            viewsCount: { increment: 1 },
          },
        });
      }
    } catch (error) {
      this.logger.error('Error incrementing views:', error);
      // Don't throw error for view tracking failures
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private canEditArticle(article: any, userId: string, userRole: string): boolean {
    // Super admin and admin can edit any article
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      return true;
    }

    // Author can edit their own articles
    if (article.author.userId === userId) {
      return true;
    }

    return false;
  }

  private mapToResponse(article: any): ArticleResponse {
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      content: article.content, // This contains the RTE JSON structure
      coverUrl: article.coverUrl,
      coverAlt: article.coverAlt,
      author: {
        id: article.author.id,
        displayName: article.author.displayName,
        bio: article.author.bio,
        avatarUrl: article.author.avatarUrl,
        userId: article.author.userId,
      },
      readMinutes: article.readMinutes,
      viewsCount: article.viewsCount,
      likesCount: article.likesCount,
      publishedAt: article.publishedAt,
      categories: article.categories?.map((cat: any) => ({
        id: cat.category.id,
        name: cat.category.name,
        slug: cat.category.slug,
        description: cat.category.description,
      })) || [],
      tags: article.tags?.map((tag: any) => ({
        id: tag.tag.id,
        name: tag.tag.name,
        slug: tag.tag.slug,
      })) || [],
      isFeatured: article.isFeatured,
      status: article.status,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      metaImageUrl: article.metaImageUrl,
      language: article.language,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }

  private handleImagesUpdate(existingImages: string[], newImages?: string[], removeImages?: string[]): string[] {
    let result = [...(existingImages || [])];
    
    // Add new images
    if (newImages && newImages.length > 0) {
      result = [...result, ...newImages];
    }
    
    // Remove specified images
    if (removeImages && removeImages.length > 0) {
      result = result.filter(img => !removeImages.includes(img));
      // Delete files from disk
      this.deleteFilesFromDisk(removeImages).catch(error => {
        this.logger.error('Error deleting image files:', error);
      });
    }
    
    return result;
  }

  private handleVideosUpdate(existingVideos: string[], newVideos?: string[], removeVideos?: string[]): string[] {
    let result = [...(existingVideos || [])];
    
    // Add new videos
    if (newVideos && newVideos.length > 0) {
      result = [...result, ...newVideos];
    }
    
    // Remove specified videos
    if (removeVideos && removeVideos.length > 0) {
      result = result.filter(vid => !removeVideos.includes(vid));
      // Delete files from disk
      this.deleteFilesFromDisk(removeVideos).catch(error => {
        this.logger.error('Error deleting video files:', error);
      });
    }
    
    return result;
  }

  private async deleteFilesFromDisk(filePaths: string[]): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    for (const filePath of filePaths) {
      try {
        // Only delete files that are under our uploads directory for security
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const fullPath = path.resolve(uploadsDir, filePath);
        
        if (fullPath.startsWith(uploadsDir) && fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          this.logger.log(`Deleted file: ${filePath}`);
        } else {
          this.logger.warn(`Skipped deletion of file outside uploads directory: ${filePath}`);
        }
      } catch (error) {
        this.logger.error(`Error deleting file ${filePath}:`, error);
      }
    }
  }
}


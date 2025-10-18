import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateArticleTagDto, UpdateArticleTagDto } from './dto/article-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('article-tags')
@Controller('article-tags')
export class ArticleTagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags with counts [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Popular tags retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Look-back window in days for counts', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of tags to return', type: Number })
  async getPopular(
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const startDate = days ? new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) : undefined;

      const grouped = await this.prisma.articleOnTags.groupBy({
        by: ['articleTagId'],
        _count: { articleTagId: true },
        where: {
          article: {
            isActive: true,
            isDeleted: false,
            status: 'PUBLISHED',
            ...(startDate ? { publishedAt: { gte: startDate } } : {}),
          },
        },
        orderBy: { _count: { articleTagId: 'desc' } },
      });

      const ids = grouped.map(g => g.articleTagId);
      if (ids.length === 0) return [];

      const tags = await this.prisma.articleTag.findMany({
        where: { id: { in: ids }, isActive: true, isDeleted: false },
        select: { id: true, name: true, slug: true },
      });

      const countMap = new Map(grouped.map(g => [g.articleTagId, g._count.articleTagId]));
      const result = tags
        .map(t => ({ id: t.id, name: t.name, slug: t.slug, count: countMap.get(t.id) || 0 }))
        .sort((a, b) => b.count - a.count);

      return typeof limit === 'number' ? result.slice(0, Number(limit)) : result;
    } catch (e) {
      throw new Error('Failed to load popular tags');
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active article tags [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  async findAll() {
    return this.prisma.articleTag.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
    });
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get article tag by slug [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiParam({ name: 'slug', description: 'Tag slug' })
  async findOne(@Param('slug') slug: string) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { slug },
    });

    if (!tag || !tag.isActive || tag.isDeleted) {
      throw new Error('Tag not found');
    }

    return tag;
  }

  @Post()
  @Public()
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateArticleTagDto })
  @ApiOperation({ summary: 'Create a new article tag [Roles: PUBLIC]' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createTagDto: CreateArticleTagDto, @Request() req?) {
    const slug = this.generateSlug(createTagDto.name);
    
    // Check if slug already exists
    const existingTag = await this.prisma.articleTag.findUnique({
      where: { slug },
    });

    if (existingTag) {
      throw new Error('A tag with this name already exists');
    }

    const data: any = { ...createTagDto, slug };
    if (req && req.user && req.user.id) {
      data.createdBy = req.user.id;
    }

    return this.prisma.articleTag.create({ data });
  }

  @Patch(':id')
  @Public()
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateArticleTagDto })
  @ApiOperation({ summary: 'Update an article tag [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  async update(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateArticleTagDto,
    @Request() req,
  ) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { id },
    });

    if (!tag || !tag.isActive || tag.isDeleted) {
      throw new Error('Tag not found');
    }

    const updateData: any = {
      ...updateTagDto,
      updatedBy: req?.user?.id,
    };

    // Generate new slug if name is being updated
    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const newSlug = this.generateSlug(updateTagDto.name);
      const existingTag = await this.prisma.articleTag.findUnique({
        where: { slug: newSlug },
      });

      if (existingTag && existingTag.id !== id) {
        throw new Error('A tag with this name already exists');
      }
      updateData.slug = newSlug;
    }

    return this.prisma.articleTag.update({
      where: { id },
      data: updateData,
    });
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an article tag [Roles: PUBLIC]' })
  @ApiResponse({ status: 204, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  async remove(@Param('id') id: string, @Request() req) {
    const tag = await this.prisma.articleTag.findUnique({
      where: { id },
    });

    if (!tag || !tag.isActive || tag.isDeleted) {
      throw new Error('Tag not found');
    }

    await this.prisma.articleTag.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req?.user?.id,
      },
    });
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hard delete an article tag [Roles: SUPER_ADMIN]' })
  @ApiResponse({ status: 204, description: 'Tag hard deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  async removeHard(@Param('id') id: string) {
    const tag = await this.prisma.articleTag.findUnique({ where: { id } });
    if (!tag) {
      throw new Error('Tag not found');
    }
    await this.prisma.articleTag.delete({ where: { id } });
  }

  @Patch(':id/restore')
  @Public()
  @ApiOperation({ summary: 'Restore a soft-deleted article tag [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Tag restored successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  async restore(@Param('id') id: string, @Request() req) {
    const tag = await this.prisma.articleTag.findUnique({ where: { id } });
    if (!tag) {
      throw new Error('Tag not found');
    }
    return this.prisma.articleTag.update({
      where: { id },
      data: {
        isDeleted: false,
        isActive: true,
        deletedAt: null as any,
        deletedBy: null as any,
        updatedBy: req?.user?.id,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}


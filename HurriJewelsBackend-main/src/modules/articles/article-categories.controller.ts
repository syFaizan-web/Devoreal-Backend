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
  UseInterceptors,
  UploadedFile,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateArticleCategoryDto, UpdateArticleCategoryDto } from './dto/article-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('article-categories')
@Controller('article-categories')
export class ArticleCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('with-counts')
  @ApiOperation({ summary: 'Get categories with article counts [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Categories with counts retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Look-back window in days for counts', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of categories to return', type: Number })
  async getWithCounts(
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const startDate = days ? new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) : undefined;

      const grouped = await this.prisma.articleOnCategories.groupBy({
        by: ['articleCategoryId'],
        _count: { articleCategoryId: true },
        where: {
          article: {
            isActive: true,
            isDeleted: false,
            status: 'PUBLISHED',
            ...(startDate ? { publishedAt: { gte: startDate } } : {}),
          },
        },
        orderBy: { _count: { articleCategoryId: 'desc' } },
      });

      const ids = grouped.map(g => g.articleCategoryId);
      if (ids.length === 0) return [];

      const categories = await this.prisma.articleCategory.findMany({
        where: { id: { in: ids }, isActive: true, isDeleted: false },
        select: { id: true, name: true, slug: true },
      });

      const countMap = new Map(grouped.map(g => [g.articleCategoryId, g._count.articleCategoryId]));
      const result = categories
        .map(c => ({ id: c.id, name: c.name, slug: c.slug, count: countMap.get(c.id) || 0 }))
        .sort((a, b) => b.count - a.count);

      return typeof limit === 'number' ? result.slice(0, Number(limit)) : result;
    } catch (e) {
      throw new Error('Failed to load categories with counts');
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active article categories [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAll() {
    return this.prisma.articleCategory.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
    });
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get article category by slug [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  async findOne(@Param('slug') slug: string) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { slug },
    });

    if (!category || !category.isActive || category.isDeleted) {
      throw new Error('Category not found');
    }

    return category;
  }

  @Post()
  @Public()
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateArticleCategoryDto })
  @ApiOperation({ summary: 'Create a new article category [Roles: PUBLIC]' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createCategoryDto: CreateArticleCategoryDto,
    @Request() req: any,
  ) {
    try {
      console.log('📝 Processing article category creation request (JSON)...');
      const { name, description } = createCategoryDto;
      const slug = this.generateSlug(name);
      
      // Check if slug already exists
      const existingCategory = await this.prisma.articleCategory.findUnique({
        where: { slug },
      });

      if (existingCategory) {
        throw new Error('A category with this name already exists');
      }

      console.log('✅ Creating category with:', { name, description, slug });

      return this.prisma.articleCategory.create({
        data: {
          name,
          description,
          slug,
          createdBy: req?.user?.id,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      throw new Error('Failed to create category: ' + error.message);
    }
  }

  @Patch(':id')
  @Public()
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateArticleCategoryDto })
  @ApiOperation({ summary: 'Update an article category [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: any,
    @Request() req: any,
  ) {
    try {
      console.log('📝 Processing article category update request (JSON)...');

      const category = await this.prisma.articleCategory.findUnique({
        where: { id },
      });

      if (!category || !category.isActive || category.isDeleted) {
        throw new Error('Category not found');
      }

      const updateData: any = { ...updateCategoryDto, updatedBy: req?.user?.id };
      
      // Generate new slug if name is being updated
      if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
        const newSlug = this.generateSlug(updateCategoryDto.name);
        const existingCategory = await this.prisma.articleCategory.findUnique({
          where: { slug: newSlug },
        });

        if (existingCategory && existingCategory.id !== id) {
          throw new Error('A category with this name already exists');
        }
        updateData.slug = newSlug;
      }

      console.log('✅ Updating category with:', updateData);

      return this.prisma.articleCategory.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already exists'))) {
        throw error;
      }
      throw new Error('Failed to update category: ' + error.message);
    }
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an article category [Roles: PUBLIC]' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async remove(@Param('id') id: string, @Request() req) {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
    });

    if (!category || !category.isActive || category.isDeleted) {
      throw new Error('Category not found');
    }

    await this.prisma.articleCategory.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req?.user?.id ?? null,
      },
    });
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hard delete an article category [Roles: SUPER_ADMIN]' })
  @ApiResponse({ status: 204, description: 'Category hard deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async removeHard(@Param('id') id: string) {
    const category = await this.prisma.articleCategory.findUnique({ where: { id } });
    if (!category) {
      throw new Error('Category not found');
    }
    await this.prisma.articleCategory.delete({ where: { id } });
  }

  @Patch(':id/restore')
  @Public()
  @ApiOperation({ summary: 'Restore a soft-deleted article category [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Category restored successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async restore(@Param('id') id: string, @Request() req) {
    const category = await this.prisma.articleCategory.findUnique({ where: { id } });
    if (!category) {
      throw new Error('Category not found');
    }
    return this.prisma.articleCategory.update({
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


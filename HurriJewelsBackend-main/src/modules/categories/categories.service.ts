import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService
  ) {}

  async create(createCategoryDto: CreateCategoryDto, userId?: string) {
    try {
      this.logger.log('Creating new category', { name: createCategoryDto.name });
      
      // Validate required fields
      if (!createCategoryDto.name || createCategoryDto.name.trim() === '') {
        throw new BadRequestException('Category name is required');
      }
      
      // Check if category with same name already exists (including soft-deleted ones)
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          name: createCategoryDto.name.trim(),
          isDeleted: false,
        },
      });

      if (existingCategory) {
        this.logger.warn('Category creation failed - name already exists', { name: createCategoryDto.name });
        throw new ConflictException(`Category with name "${createCategoryDto.name}" already exists`);
      }

      // Handle slug generation
      let slug: string;
      if (createCategoryDto.slug === null || createCategoryDto.slug === undefined) {
        // Generate slug from name
        slug = this.generateSlug(createCategoryDto.name);
      } else if (typeof createCategoryDto.slug === 'string') {
        // Use provided slug (already trimmed by Transform decorator)
        slug = this.generateSlug(createCategoryDto.slug);
      } else {
        // Handle non-string slug types
        const stringSlug = String(createCategoryDto.slug).trim();
        if (!stringSlug) {
          // Empty slug after conversion, generate from name
          slug = this.generateSlug(createCategoryDto.name);
        } else {
          slug = this.generateSlug(stringSlug);
        }
      }

      // Check if slug already exists
      const existingCategoryBySlug = await this.prisma.category.findFirst({
        where: {
          slug: slug,
          isDeleted: false,
        } as any,
      });

      if (existingCategoryBySlug) {
        this.logger.warn('Category creation failed - slug already exists', { slug });
        throw new ConflictException(`Category with slug "${slug}" already exists`);
      }

      // Prepare data for creation following the schema structure
      const categoryData = {
        name: createCategoryDto.name.trim(),
        slug,
        description: createCategoryDto.description?.trim() || null,
        image: createCategoryDto.image?.trim() || null,
        isActive: createCategoryDto.isActive ?? true,
        createdBy: userId || 'system',
      } as any;

      const category = await this.prisma.category.create({
        data: categoryData,
        include: {
          products: true,
        },
      });

      this.logger.log('Category created successfully', { id: category.id, name: category.name, slug: (category as any).slug });
      return category;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Category with this name or slug already exists');
      }
      this.logger.error('Failed to create category', error.stack);
      throw new InternalServerErrorException('Failed to create category: ' + error.message);
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async findAll() {
    try {
      this.logger.debug('Fetching all categories');
      const categories = await this.prisma.category.findMany({
        where: { isDeleted: false } as any,
        include: {
          products: true,
        },
      });
      this.logger.log('Categories fetched successfully', { count: categories.length });
      return categories;
    } catch (error) {
      this.logger.error('Failed to fetch categories', error.stack);
      throw new InternalServerErrorException('Failed to fetch categories: ' + error.message);
    }
  }

  async findOne(id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.debug('Fetching category by ID', { id });
      const category = await this.prisma.category.findFirst({
        where: { id, isDeleted: false } as any,
        include: {
          products: true,
        },
      });

      if (!category) {
        this.logger.warn('Category not found', { id });
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      this.logger.log('Category fetched successfully', { id, name: category.name });
      return category;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to fetch category', error.stack, { id });
      throw new InternalServerErrorException('Failed to fetch category: ' + error.message);
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Updating category', { id, updateData: { name: updateCategoryDto.name } });
      const existingCategory = await this.findOne(id);
      
      // If updating with a new image, delete the old image
      if (updateCategoryDto.image && existingCategory.image && updateCategoryDto.image !== existingCategory.image) {
        try {
          this.logger.debug('Deleting old category image', { oldImage: existingCategory.image });
          await this.fileUploadService.deleteFile(existingCategory.image);
          this.logger.log('Old category image deleted successfully');
        } catch (error) {
          this.logger.warn('Failed to delete old category image', { error: error.message, oldImage: existingCategory.image });
          // Don't fail the update if image deletion fails
        }
      }
      
      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
        include: {
          products: true,
        },
      });

      this.logger.log('Category updated successfully', { id, name: updatedCategory.name });
      return updatedCategory;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      this.logger.error('Failed to update category', error.stack, { id });
      throw new InternalServerErrorException('Failed to update category: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Soft deleting category', { id });
      const existingCategory = await this.findOne(id);
      
      // Delete the category image if it exists
      if (existingCategory.image) {
        try {
          this.logger.debug('Deleting category image', { image: existingCategory.image });
          await this.fileUploadService.deleteFile(existingCategory.image);
          this.logger.log('Category image deleted successfully');
        } catch (error) {
          // Log error but don't fail the deletion if image deletion fails
          this.logger.warn('Failed to delete category image', { error: error.message, image: existingCategory.image });
        }
      }
      
      const deletedCategory = await this.prisma.category.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() } as any,
      });

      this.logger.log('Category soft deleted successfully', { id, name: existingCategory.name });
      return deletedCategory;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      this.logger.error('Failed to delete category', error.stack, { id });
      throw new InternalServerErrorException('Failed to delete category: ' + error.message);
    }
  }

  async hardDelete(id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Hard deleting category', { id });
      await this.prisma.category.delete({ where: { id } });
      this.logger.log('Category hard deleted successfully', { id });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      this.logger.error('Failed to hard delete category', error.stack, { id });
      throw new InternalServerErrorException('Failed to hard delete category: ' + error.message);
    }
  }

  async softDelete(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Soft deleting category with audit', { id, userId });
      await this.findOne(id);
      await this.prisma.category.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } as any,
      });
      this.logger.log('Category soft deleted with audit successfully', { id, userId });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      this.logger.error('Failed to soft delete category', error.stack, { id, userId });
      throw new InternalServerErrorException('Failed to soft delete category: ' + error.message);
    }
  }

  async restore(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Restoring category', { id, userId });
      
      // Check if category exists (including soft-deleted ones)
      const category = await this.prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Restore the category: set isDeleted to false and isActive to true
      await this.prisma.category.update({
        where: { id },
        data: { 
          isDeleted: false, 
          isActive: true,  // Set to active when restoring
          deletedAt: null, 
          deletedBy: null, 
          updatedBy: userId 
        } as any,
      });
      this.logger.log('Category restored successfully', { id, userId });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      this.logger.error('Failed to restore category', error.stack, { id, userId });
      throw new InternalServerErrorException('Failed to restore category: ' + error.message);
    }
  }

  async toggleStatus(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Toggling category status', { id, userId });
      const category = await this.findOne(id);
      const newStatus = !category.isActive;
      await this.prisma.category.update({
        where: { id },
        data: { isActive: newStatus, updatedBy: userId } as any,
      });
      this.logger.log('Category status toggled successfully', { id, newStatus, userId });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      this.logger.error('Failed to toggle category status', error.stack, { id, userId });
      throw new InternalServerErrorException('Failed to toggle category status: ' + error.message);
    }
  }
}

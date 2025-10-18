import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      this.logger.log('Creating new product', { name: createProductDto.name, categoryId: createProductDto.categoryId });
      
      // Validate required fields
      if (!createProductDto.name || createProductDto.name.trim() === '') {
        throw new BadRequestException('Product name is required');
      }
      if (!createProductDto.price || createProductDto.price <= 0) {
        throw new BadRequestException('Valid product price is required');
      }
      if (!createProductDto.categoryId || createProductDto.categoryId.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      // Check if category exists
      const category = await this.prisma.category.findFirst({
        where: { id: createProductDto.categoryId, isDeleted: false }
      });
      if (!category) {
        this.logger.warn('Product creation failed - category not found', { categoryId: createProductDto.categoryId });
        throw new NotFoundException('Category not found');
      }

      // Check if vendor exists (if provided)
      if (createProductDto.vendorId) {
        const vendor = await this.prisma.vendorProfile.findFirst({
          where: { id: createProductDto.vendorId, isActive: true }
        });
        if (!vendor) {
          this.logger.warn('Product creation failed - vendor not found or inactive', { vendorId: createProductDto.vendorId });
          throw new NotFoundException('Vendor not found or inactive');
        }
      }

      const product = await this.prisma.product.create({
        data: createProductDto as any,
        include: {
          vendor: true,
          category: true,
        },
      });

      this.logger.log('Product created successfully', { id: product.id, name: product.name });
      return product;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Product with this name already exists');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid category or vendor reference');
      }
      this.logger.error('Failed to create product', error.stack);
      throw new InternalServerErrorException('Failed to create product: ' + error.message);
    }
  }

  async findAll() {
    try {
      this.logger.debug('Fetching all products');
      const products = await this.prisma.product.findMany({
        where: { isDeleted: false } as any,
        include: {
          vendor: true,
          category: true,
        },
      });
      this.logger.log('Products fetched successfully', { count: products.length });
      return products;
    } catch (error) {
      this.logger.error('Failed to fetch products', error.stack);
      throw new InternalServerErrorException('Failed to fetch products: ' + error.message);
    }
  }

  async findOne(id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.debug('Fetching product by ID', { id });
      const product = await this.prisma.product.findFirst({
        where: { id, isDeleted: false } as any,
        include: {
          vendor: true,
          category: true,
        },
      });

      if (!product) {
        this.logger.warn('Product not found', { id });
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      this.logger.log('Product fetched successfully', { id, name: product.name });
      return product;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to fetch product', error.stack, { id });
      throw new InternalServerErrorException('Failed to fetch product: ' + error.message);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Updating product', { id, updateData: { name: updateProductDto.name } });
      const existingProduct = await this.findOne(id);
      
      // Validate category if being updated
      if (updateProductDto.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: updateProductDto.categoryId, isDeleted: false }
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
      }

      // Validate vendor if being updated
      if (updateProductDto.vendorId) {
        const vendor = await this.prisma.vendorProfile.findFirst({
          where: { id: updateProductDto.vendorId, isActive: true }
        });
        if (!vendor) {
          throw new NotFoundException('Vendor not found or inactive');
        }
      }
      
      // If updating with new images, delete the old images
      if (updateProductDto.images && existingProduct.images && updateProductDto.images !== existingProduct.images) {
        try {
          // Parse the old images JSON string to get array of image paths
          const oldImagePaths = JSON.parse(existingProduct.images);
          if (Array.isArray(oldImagePaths)) {
            for (const imagePath of oldImagePaths) {
              try {
                await this.fileUploadService.deleteFile(imagePath);
              } catch (error) {
                this.logger.warn('Failed to delete old product image', { imagePath, error: error.message });
              }
            }
          } else {
            // If it's not an array, treat as single image
            try {
              await this.fileUploadService.deleteFile(existingProduct.images);
            } catch (error) {
              this.logger.warn('Failed to delete old product image', { error: error.message, image: existingProduct.images });
            }
          }
        } catch (error) {
          // If old images is not valid JSON, treat as single image path
          try {
            await this.fileUploadService.deleteFile(existingProduct.images);
          } catch (deleteError) {
            this.logger.warn('Failed to delete old product image', { error: deleteError.message, image: existingProduct.images });
          }
        }
      }
      
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: updateProductDto as any,
        include: {
          vendor: true,
          category: true,
        },
      });

      this.logger.log('Product updated successfully', { id, name: updatedProduct.name });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid category or vendor reference');
      }
      this.logger.error('Failed to update product', error.stack, { id });
      throw new InternalServerErrorException('Failed to update product: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Soft deleting product', { id });
      const existingProduct = await this.findOne(id);
      
      // Delete the product images if they exist
      if (existingProduct.images) {
        try {
          // Parse the images JSON string to get array of image paths
          const imagePaths = JSON.parse(existingProduct.images);
          if (Array.isArray(imagePaths)) {
            for (const imagePath of imagePaths) {
              try {
                await this.fileUploadService.deleteFile(imagePath);
              } catch (error) {
                this.logger.warn('Failed to delete product image', { imagePath, error: error.message });
              }
            }
          }
        } catch (error) {
          // If images is not a valid JSON array, treat it as a single image path
          try {
            await this.fileUploadService.deleteFile(existingProduct.images);
          } catch (deleteError) {
            this.logger.warn('Failed to delete product image', { error: deleteError.message, image: existingProduct.images });
          }
        }
      }
      
      const deletedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        } as any,
      });

      this.logger.log('Product soft deleted successfully', { id, name: existingProduct.name });
      return deletedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      this.logger.error('Failed to delete product', error.stack, { id });
      throw new InternalServerErrorException('Failed to delete product: ' + error.message);
    }
  }

  async softDelete(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      await this.findOne(id);
      await this.prisma.product.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } as any,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw new InternalServerErrorException('Failed to soft delete product: ' + error.message);
    }
  }

  async restore(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      await this.findOne(id);
      await this.prisma.product.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedBy: null, updatedBy: userId } as any,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw new InternalServerErrorException('Failed to restore product: ' + error.message);
    }
  }

  async toggleStatus(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      const product = await this.findOne(id);
      await this.prisma.product.update({
        where: { id },
        data: { isActive: !product.isActive, updatedBy: userId } as any,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw new InternalServerErrorException('Failed to toggle product status: ' + error.message);
    }
  }
}

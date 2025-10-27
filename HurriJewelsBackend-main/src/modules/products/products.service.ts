import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductMainDto } from './dto/create-product-main.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService
  ) {}

  /**
   * Helper method to handle common Prisma errors
   */
  private handlePrismaError(error: any, operation: string, context?: any): never {
    this.logger.error(`Prisma error during ${operation}`, error.stack, context);
    
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(`A record with this data already exists`);
      case 'P2003':
        throw new BadRequestException('Invalid reference to related record');
      case 'P2025':
        throw new NotFoundException('Record not found');
      case 'P2021':
        throw new NotFoundException('Table does not exist');
      case 'P2022':
        throw new NotFoundException('Column does not exist');
      default:
        throw new InternalServerErrorException(`Database error during ${operation}: ${error.message}`);
    }
  }

  /**
   * Helper method to validate required fields
   */
  private validateRequiredFields(data: any, requiredFields: string[], operation: string): void {
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        throw new BadRequestException(`${field} is required for ${operation}`);
      }
    }
  }

  async create(createProductMainDto: CreateProductDto) {
    try {
      this.logger.log('Creating new product', { name: createProductMainDto.name, categoryId: createProductMainDto.categoryId });
      
      // Validate required fields using helper method
      this.validateRequiredFields(createProductMainDto, ['name', 'categoryId'], 'product creation');
      
      if (!createProductMainDto.price || createProductMainDto.price <= 0) {
        throw new BadRequestException('Valid product price is required');
      }

      // Check for duplicate product name
      const existingProductByName = await this.prisma.product.findFirst({
        where: {
          name: createProductMainDto.name
        }
      });

      if (existingProductByName) {
        throw new ConflictException(`Product name "${createProductMainDto.name}" already exists`);
      }

      // Check if category exists
      const category = await this.prisma.category.findFirst({
        where: { id: createProductMainDto.categoryId }
      });
      if (!category) {
        this.logger.warn('Product creation failed - category not found', { categoryId: createProductMainDto.categoryId });
        throw new NotFoundException('Category not found');
      }

      // Check if vendor exists (if provided)
      if (createProductMainDto.vendorId) {
        const vendor = await this.prisma.vendorProfile.findFirst({
          where: { id: createProductMainDto.vendorId, isActive: true }
        });
        if (!vendor) {
          this.logger.warn('Product creation failed - vendor not found or inactive', { vendorId: createProductMainDto.vendorId });
          throw new NotFoundException('Vendor not found or inactive');
        }
      }

      const product = await this.prisma.product.create({
        data: {
          name: createProductMainDto.name,
          shortDescription: createProductMainDto.description,
          price: createProductMainDto.price,
          image: createProductMainDto.images,
          vendorId: createProductMainDto.vendorId,
          categoryId: createProductMainDto.categoryId,
          createdBy: createProductMainDto.createdBy,
          updatedBy: createProductMainDto.createdBy,
        } as any,
        include: {
          vendor: true,
          category: true,
        },
      });

      this.logger.log('Product created successfully', { id: product.id, name: product.name });
      return product;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      if (error.code && error.code.startsWith('P')) {
        this.handlePrismaError(error, 'product creation', { name: createProductMainDto.name });
      }
      this.logger.error('Failed to create product', error.stack);
      throw new InternalServerErrorException('Failed to create product: ' + error.message);
    }
  }

  async findAll() {
    try {
      this.logger.debug('Fetching all products');
      const products = await this.prisma.product.findMany({
        where: {} as any, // Remove isDeleted filter since new Product model doesn't have this field
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
        where: { id } as any,
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
      
      // Check for duplicate product name if name is being updated
      if (updateProductDto.name && updateProductDto.name !== existingProduct.name) {
        const existingProductByName = await this.prisma.product.findFirst({
          where: {
            name: updateProductDto.name,
            id: { not: id } // Exclude current product
          }
        });

        if (existingProductByName) {
          throw new ConflictException(`Product name "${updateProductDto.name}" already exists`);
        }
      }
      
      // Validate category if being updated
      if (updateProductDto.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: updateProductDto.categoryId }
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
      if (updateProductDto.images && (existingProduct as any).image && updateProductDto.images !== (existingProduct as any).image) {
        try {
          // Parse the old images JSON string to get array of image paths
          const oldImagePaths = JSON.parse((existingProduct as any).image);
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
              await this.fileUploadService.deleteFile((existingProduct as any).image);
            } catch (error) {
              this.logger.warn('Failed to delete old product image', { error: error.message, image: (existingProduct as any).image });
            }
          }
        } catch (error) {
          // If old images is not valid JSON, treat as single image path
          try {
            await this.fileUploadService.deleteFile((existingProduct as any).image);
          } catch (deleteError) {
            this.logger.warn('Failed to delete old product image', { error: deleteError.message, image: (existingProduct as any).image });
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

  async hardDelete(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Starting hard delete for product', { productId: id, userId });

      // Check if product exists
      const product = await this.prisma.product.findFirst({
        where: { id },
        include: {
          basic: true,
          pricing: true,
          media: true,
          seo: true,
          attributesTag: true,
          variants: true,
          inventory: true,
          reels: true,
          itemDetails: true,
          shippingPolicies: true
        }
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Use transaction to ensure all deletions succeed or fail together
      await this.prisma.$transaction(async (prisma) => {
        // Delete all child tables first (due to foreign key constraints)
        if (product.basic?.id) {
          await prisma.productBasic.delete({
            where: { id: product.basic.id }
          });
        }

        if (product.pricing?.id) {
          await prisma.productPricing.delete({
            where: { id: product.pricing.id }
          });
        }

        if (product.media?.id) {
          await prisma.productMedia.delete({
            where: { id: product.media.id }
          });
        }

        if (product.seo?.id) {
          await prisma.productSeo.delete({
            where: { id: product.seo.id }
          });
        }

        if (product.attributesTag?.id) {
          await prisma.productAttributesTag.delete({
            where: { id: product.attributesTag.id }
          });
        }

        if (product.variants?.id) {
          await prisma.productVariants.delete({
            where: { id: product.variants.id }
          });
        }

        if (product.inventory?.id) {
          await prisma.productInventory.delete({
            where: { id: product.inventory.id }
          });
        }

        if (product.reels?.id) {
          await prisma.productReels.delete({
            where: { id: product.reels.id }
          });
        }

        if (product.itemDetails?.id) {
          await prisma.productItemDetails.delete({
            where: { id: product.itemDetails.id }
          });
        }

        if (product.shippingPolicies?.id) {
          await prisma.productShippingPolicies.delete({
            where: { id: product.shippingPolicies.id }
          });
        }

        // Delete product images if they exist
        if (product.image) {
          try {
            // Parse the images JSON string to get array of image paths
            const imagePaths = JSON.parse(product.image);
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
              await this.fileUploadService.deleteFile(product.image);
            } catch (deleteError) {
              this.logger.warn('Failed to delete product image', { error: deleteError.message, image: product.image });
            }
          }
        }

        // Finally, delete the main product record
        await prisma.product.delete({
          where: { id }
        });
      });

      this.logger.log('Product hard deleted successfully', { 
        productId: id, 
        userId,
        productName: product.name 
      });

      return { 
        success: true, 
        message: 'Product permanently deleted',
        deletedProduct: {
          id: product.id,
          name: product.name
        }
      };
    } catch (error) {
      this.logger.error('Failed to hard delete product', error.stack, { productId: id, userId });
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      throw new InternalServerErrorException('Failed to hard delete product: ' + error.message);
    }
  }

  async softDelete(id: string, userId?: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Starting soft delete for product', { productId: id, userId });

      // Check if product exists
      const product = await this.prisma.product.findFirst({
        where: { id },
        include: {
          basic: true,
          pricing: true,
          media: true,
          seo: true,
          attributesTag: true,
          variants: true,
          inventory: true,
          reels: true,
          itemDetails: true,
          shippingPolicies: true
        }
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Check if product is already soft-deleted
      if (product.isDeleted) {
        throw new BadRequestException('Product is already deleted');
      }

      // Use transaction to ensure all updates succeed or fail together
      await this.prisma.$transaction(async (prisma) => {
        // Update main product table
        await prisma.product.update({
        where: { id },
          data: {
            isActive: false,
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            updatedBy: userId
          }
        });

        // Update all child tables
        if (product.basic?.id) {
          await prisma.productBasic.update({
            where: { id: product.basic.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.pricing?.id) {
          await prisma.productPricing.update({
            where: { id: product.pricing.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.media?.id) {
          await prisma.productMedia.update({
            where: { id: product.media.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.seo?.id) {
          await prisma.productSeo.update({
            where: { id: product.seo.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.attributesTag?.id) {
          await prisma.productAttributesTag.update({
            where: { id: product.attributesTag.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.variants?.id) {
          await prisma.productVariants.update({
            where: { id: product.variants.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.inventory?.id) {
          await prisma.productInventory.update({
            where: { id: product.inventory.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.reels?.id) {
          await prisma.productReels.update({
            where: { id: product.reels.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.itemDetails?.id) {
          await prisma.productItemDetails.update({
            where: { id: product.itemDetails.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }

        if (product.shippingPolicies?.id) {
          await prisma.productShippingPolicies.update({
            where: { id: product.shippingPolicies.id },
            data: {
              isActive: false,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: userId,
              updatedBy: userId
            }
          });
        }
      });

      this.logger.log('Product soft deleted successfully', { 
        productId: id, 
        userId,
        productName: product.name 
      });
    } catch (error) {
      this.logger.error('Failed to soft delete product', error.stack, { productId: id, userId });
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

      this.logger.log('Starting restore for product', { productId: id, userId });

      // Check if product exists (including soft-deleted ones)
      const product = await this.prisma.product.findFirst({
        where: { id },
        include: {
          basic: true,
          pricing: true,
          media: true,
          seo: true,
          attributesTag: true,
          variants: true,
          inventory: true,
          reels: true,
          itemDetails: true,
          shippingPolicies: true
        }
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Check if product is already restored
      if (!product.isDeleted) {
        throw new BadRequestException('Product is not deleted, cannot restore');
      }

      // Use transaction to ensure all updates succeed or fail together
      await this.prisma.$transaction(async (prisma) => {
        // Update main product table
        await prisma.product.update({
          where: { id },
          data: {
            isActive: true,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            updatedBy: userId
          }
        });

        // Update all child tables
        if (product.basic?.id) {
          await prisma.productBasic.update({
            where: { id: product.basic.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.pricing?.id) {
          await prisma.productPricing.update({
            where: { id: product.pricing.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.media?.id) {
          await prisma.productMedia.update({
            where: { id: product.media.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.seo?.id) {
          await prisma.productSeo.update({
            where: { id: product.seo.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.attributesTag?.id) {
          await prisma.productAttributesTag.update({
            where: { id: product.attributesTag.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.variants?.id) {
          await prisma.productVariants.update({
            where: { id: product.variants.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.inventory?.id) {
          await prisma.productInventory.update({
            where: { id: product.inventory.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.reels?.id) {
          await prisma.productReels.update({
            where: { id: product.reels.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.itemDetails?.id) {
          await prisma.productItemDetails.update({
            where: { id: product.itemDetails.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }

        if (product.shippingPolicies?.id) {
          await prisma.productShippingPolicies.update({
            where: { id: product.shippingPolicies.id },
            data: {
              isActive: true,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId
            }
          });
        }
      });

      this.logger.log('Product restored successfully', { 
        productId: id, 
        userId,
        productName: product.name 
      });
    } catch (error) {
      this.logger.error('Failed to restore product', error.stack, { productId: id, userId });
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
        data: { updatedBy: userId } as any, // New Product model doesn't have isActive field
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

  // ===== NEW TAB-WISE PRODUCT METHODS =====

  /**
   * Create main product and all child tabs in one transaction
   */
  async createMain(createProductMainDto: CreateProductMainDto) {
    try {
      this.logger.log('Creating new product with tab-wise structure', { name: createProductMainDto.name });

      // Validate required fields - name is still required for product creation
      if (!createProductMainDto.name || createProductMainDto.name.trim() === '') {
        this.logger.error('Product creation failed - name validation', { 
          receivedName: createProductMainDto.name,
          nameType: typeof createProductMainDto.name,
          fullDto: JSON.stringify(createProductMainDto, null, 2)
        });
        throw new BadRequestException('Product name is required and cannot be empty');
      }

      // Additional validation for name length
      if (createProductMainDto.name.length > 200) {
        throw new BadRequestException('Product name must not exceed 200 characters');
      }

      // Validate short description length if provided
      if (createProductMainDto.shortDescription && createProductMainDto.shortDescription.length > 500) {
        throw new BadRequestException('Short description must not exceed 500 characters');
      }

      // Check for duplicate product name
      const existingProductByName = await this.prisma.product.findFirst({
        where: {
          name: createProductMainDto.name
        }
      });

      if (existingProductByName) {
        throw new ConflictException(`Product name "${createProductMainDto.name}" already exists`);
      }

      // Check for duplicate slug in basic tab if provided
      if (createProductMainDto.basic?.slug) {
        const existingProductBySlug = await (this.prisma as any).productBasic.findFirst({
          where: {
            slug: createProductMainDto.basic.slug
          }
        });

        if (existingProductBySlug) {
          throw new ConflictException(`Product slug "${createProductMainDto.basic.slug}" already exists`);
        }
      }

      // Validate references if provided
      if (createProductMainDto.basic?.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: createProductMainDto.basic.categoryId }
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
      }

      if (createProductMainDto.basic?.collectionId) {
        const collection = await this.prisma.collection.findFirst({
          where: { id: createProductMainDto.basic.collectionId }
        });
        if (!collection) {
          throw new NotFoundException('Collection not found');
        }
      }

      if (createProductMainDto.basic?.signaturePieceId) {
        const signaturePiece = await this.prisma.signaturePiece.findFirst({
          where: { id: createProductMainDto.basic.signaturePieceId }
        });
        if (!signaturePiece) {
          throw new NotFoundException('Signature piece not found');
        }
      }

      const result = await this.prisma.$transaction(async (prisma) => {
        // Create main product with read-only fields initialized
        const productMain = await prisma.product.create({
          data: {
            name: createProductMainDto.name,
            shortDescription: createProductMainDto.shortDescription,
            price: createProductMainDto.price,
            image: createProductMainDto.image,
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
            // Assign category ID from basic data
            categoryId: createProductMainDto.basic?.categoryId || null,
            // Initialize read-only fields
            rating: 0,
            reviewsCount: 0,
            views: 0,
          } as any,
        });

        // Create child tabs if data provided
        const childTabs = [];

        if (createProductMainDto.basic) {
          // Map DTO fields to Prisma schema field names
          const basicData = {
            productId: productMain.id,
            category: createProductMainDto.basic.categoryId, // Map categoryId to category
            collection: createProductMainDto.basic.collectionId, // Map collectionId to collection
            brand: createProductMainDto.basic.brand,
            weight: createProductMainDto.basic.weight?.toString(),
            gender: createProductMainDto.basic.gender,
            size: createProductMainDto.basic.size,
            colors: createProductMainDto.basic.colors ? JSON.stringify(createProductMainDto.basic.colors) : null,
            colorName: createProductMainDto.basic.colorName,
            description: createProductMainDto.basic.description,
            tagNumber: createProductMainDto.basic.tagNumber,
            stock: createProductMainDto.basic.stock?.toString(),
            tags: createProductMainDto.basic.tags ? JSON.stringify(createProductMainDto.basic.tags) : null,
            slug: createProductMainDto.basic.slug,
            status: createProductMainDto.basic.status,
            visibility: createProductMainDto.basic.visibility,
            publishedAt: createProductMainDto.basic.publishedAt,
            isSignaturePiece: createProductMainDto.basic.isSignaturePiece,
            isFeatured: createProductMainDto.basic.isFeatured,
            signatureLabel: createProductMainDto.basic.signatureLabel,
            signatureStory: createProductMainDto.basic.signatureStory,
            allowBackorder: createProductMainDto.basic.allowBackorder,
            isPreorder: createProductMainDto.basic.isPreorder,
            minOrderQty: createProductMainDto.basic.minOrderQty?.toString(),
            maxOrderQty: createProductMainDto.basic.maxOrderQty?.toString(),
            leadTimeDays: createProductMainDto.basic.leadTimeDays?.toString(),
            hsCode: createProductMainDto.basic.hsCode,
            warrantyInfo: createProductMainDto.basic.warrantyInfo,
            badges: createProductMainDto.basic.badges ? JSON.stringify(createProductMainDto.basic.badges) : null,
            sales: createProductMainDto.basic.sales?.toString(),
            quantity: createProductMainDto.basic.quantity?.toString(),
            reviewUi: createProductMainDto.basic.reviewUi,
            soldUi: createProductMainDto.basic.soldUi,
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
          };

          const basic = await (prisma as any).productBasic.create({
            data: basicData,
          });
          childTabs.push({ basic });
        }

        if (createProductMainDto.pricing) {
          // Map DTO fields to Prisma schema field names (all fields are String in schema)
          const pricingData = {
            productId: productMain.id,
            price: createProductMainDto.pricing.price?.toString(),
            priceUSD: createProductMainDto.pricing.priceUSD?.toString(),
            currency: createProductMainDto.pricing.currency,
            discount: createProductMainDto.pricing.discount?.toString(),
            discountType: createProductMainDto.pricing.discountType,
            compareAtPrice: createProductMainDto.pricing.compareAtPrice?.toString(),
            saleStartAt: createProductMainDto.pricing.saleStartAt,
            saleEndAt: createProductMainDto.pricing.saleEndAt,
            discountLabel: createProductMainDto.pricing.discountLabel,
            tax: createProductMainDto.pricing.tax?.toString(),
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
          };

          const pricing = await (prisma as any).productPricing.create({
            data: pricingData,
          });
          childTabs.push({ pricing });
        }

        if (createProductMainDto.media) {
          const media = await (prisma as any).productMedia.create({
            data: {
              productId: productMain.id,
              images: createProductMainDto.media.images ? JSON.stringify(createProductMainDto.media.images) : null,
              videoFile: createProductMainDto.media.videoFile,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ media });
        }

        if (createProductMainDto.seo) {
          const seo = await (prisma as any).productSeo.create({
            data: {
              productId: productMain.id,
              seoTitle: createProductMainDto.seo.seoTitle,
              seoDescription: createProductMainDto.seo.seoDescription,
              canonicalUrl: createProductMainDto.seo.canonicalUrl,
              ogImage: createProductMainDto.seo.ogImage,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ seo });
        }

        // Association tab removed - no longer needed

        if (createProductMainDto.attributesTag) {
          const attributesTag = await (prisma as any).productAttributesTag.create({
            data: {
              productId: productMain.id,
              attributes: createProductMainDto.attributesTag.attributes,
              tags: createProductMainDto.attributesTag.tags,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ attributesTag });
        }

        if (createProductMainDto.variants) {
          const variants = await (prisma as any).productVariants.create({
            data: {
              productId: productMain.id,
              variants: createProductMainDto.variants.variants,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ variants });
        }

        if (createProductMainDto.inventory) {
          // Map DTO fields to Prisma schema field names (all fields are String in schema)
          const inventoryData = {
            productId: productMain.id,
            sku: createProductMainDto.inventory.sku,
            barcode: createProductMainDto.inventory.barcode,
            inventoryQuantity: createProductMainDto.inventory.inventoryQuantity?.toString(),
            lowStockThreshold: createProductMainDto.inventory.lowStockThreshold?.toString(),
            reorderPoint: createProductMainDto.inventory.reorderPoint?.toString(),
            reorderQuantity: createProductMainDto.inventory.reorderQuantity?.toString(),
            supplier: createProductMainDto.inventory.supplier,
            supplierSku: createProductMainDto.inventory.supplierSku,
            costPrice: createProductMainDto.inventory.costPrice?.toString(),
            margin: createProductMainDto.inventory.margin?.toString(),
            location: createProductMainDto.inventory.location,
            warehouse: createProductMainDto.inventory.warehouse,
            binLocation: createProductMainDto.inventory.binLocation,
            lastRestocked: createProductMainDto.inventory.lastRestocked,
            nextRestockDate: createProductMainDto.inventory.nextRestockDate,
            inventoryStatus: createProductMainDto.inventory.inventoryStatus,
            trackInventory: createProductMainDto.inventory.trackInventory,
            reservedQuantity: createProductMainDto.inventory.reservedQuantity?.toString(),
            availableQuantity: createProductMainDto.inventory.availableQuantity?.toString(),
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
          };

          const inventory = await (prisma as any).productInventory.create({
            data: inventoryData,
          });
          childTabs.push({ inventory });
        }

        if (createProductMainDto.reels) {
          // Map DTO fields to Prisma schema field names (all fields are String in schema)
          const reelsData = {
            productId: productMain.id,
            platform: createProductMainDto.reels.platform,
            reelTitle: createProductMainDto.reels.reelTitle,
            reelDescription: createProductMainDto.reels.reelDescription,
            reelLanguage: createProductMainDto.reels.reelLanguage,
            captionsUrl: createProductMainDto.reels.captionsUrl,
            thumbnailUrl: createProductMainDto.reels.thumbnailUrl,
            durationSec: createProductMainDto.reels.durationSec?.toString(),
            aspectRatio: createProductMainDto.reels.aspectRatio,
            ctaUrl: createProductMainDto.reels.ctaUrl,
            reelTags: createProductMainDto.reels.reelTags,
            isPublic: createProductMainDto.reels.isPublic,
            isPinned: createProductMainDto.reels.isPinned,
            reelOrder: createProductMainDto.reels.reelOrder?.toString(),
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
          };

          const reels = await (prisma as any).productReels.create({
            data: reelsData,
          });
          childTabs.push({ reels });
        }

        if (createProductMainDto.itemDetails) {
          // Parse trustBadges JSON and split into individual trust badge fields
          let trustBadge1, trustBadge2, trustBadge3;
          if (createProductMainDto.itemDetails.trustBadges) {
            try {
              const badges = JSON.parse(createProductMainDto.itemDetails.trustBadges);
              if (Array.isArray(badges)) {
                trustBadge1 = badges[0] ? JSON.stringify(badges[0]) : null;
                trustBadge2 = badges[1] ? JSON.stringify(badges[1]) : null;
                trustBadge3 = badges[2] ? JSON.stringify(badges[2]) : null;
              }
            } catch (error) {
              // If parsing fails, treat as single badge
              trustBadge1 = createProductMainDto.itemDetails.trustBadges;
            }
          }

          const itemDetails = await (prisma as any).productItemDetails.create({
            data: {
              productId: productMain.id,
              material: createProductMainDto.itemDetails.material,
              warranty: createProductMainDto.itemDetails.warranty,
              certification: createProductMainDto.itemDetails.certification,
              vendorName: createProductMainDto.itemDetails.vendorName,
              shippingFreeText: createProductMainDto.itemDetails.shippingFreeText,
              qualityGuaranteeText: createProductMainDto.itemDetails.qualityGuaranteeText,
              careInstructionsText: createProductMainDto.itemDetails.careInstructionsText,
              didYouKnow: createProductMainDto.itemDetails.didYouKnow,
              faqs: createProductMainDto.itemDetails.faqs,
              sellerBlurb: createProductMainDto.itemDetails.sellerBlurb,
              trustBadge1: trustBadge1,
              trustBadge2: trustBadge2,
              trustBadge3: trustBadge3,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ itemDetails });
        }

        if (createProductMainDto.shippingPolicies) {
          // Map DTO fields to Prisma schema field names (all fields are String in schema)
          const shippingPoliciesData = {
            productId: productMain.id,
            shippingInfo: createProductMainDto.shippingPolicies.shippingInfo,
            shippingNotes: createProductMainDto.shippingPolicies.shippingNotes,
            packagingDetails: createProductMainDto.shippingPolicies.packagingDetails,
            returnPolicy: createProductMainDto.shippingPolicies.returnPolicy,
            returnWindowDays: createProductMainDto.shippingPolicies.returnWindowDays?.toString(),
            returnFees: createProductMainDto.shippingPolicies.returnFees?.toString(),
            isReturnable: createProductMainDto.shippingPolicies.isReturnable,
            exchangePolicy: createProductMainDto.shippingPolicies.exchangePolicy,
            warrantyPeriodMonths: createProductMainDto.shippingPolicies.warrantyPeriodMonths?.toString(),
            warrantyType: createProductMainDto.shippingPolicies.warrantyType,
            originCountry: createProductMainDto.shippingPolicies.originCountry,
            weightKg: createProductMainDto.shippingPolicies.weightKg?.toString(),
            dimensions: createProductMainDto.shippingPolicies.dimensions,
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
          };

          const shippingPolicies = await (prisma as any).productShippingPolicies.create({
            data: shippingPoliciesData,
          });
          childTabs.push({ shippingPolicies });
        }

        return { productMain, childTabs };
      });

      this.logger.log('Product created successfully with tab-wise structure', { 
        id: result.productMain.id, 
        name: result.productMain.name,
        childTabsCount: result.childTabs.length 
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Product with this name already exists');
      }
      this.logger.error('Failed to create product with tab-wise structure', error.stack);
      throw new InternalServerErrorException('Failed to create product: ' + error.message);
    }
  }

  /**
   * Migrate a legacy product to the new tab-based structure
   */
  async migrateLegacyProduct(legacyProductId: string, createdBy: string = 'migration') {
    try {
      this.logger.log('Migrating legacy product to tab-based structure', { legacyProductId });

      // Get the product (now using the unified products table)
      const product = await this.prisma.product.findFirst({
        where: { id: legacyProductId },
        include: {
          vendor: true,
          category: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${legacyProductId} not found`);
      }

      // Check if already migrated
      const existingProductMain = await this.prisma.product.findFirst({
        where: { name: product.name }
      });

      if (existingProductMain) {
        throw new ConflictException(`Product "${product.name}" already exists in tab-based structure`);
      }

      // Create new tab-based product
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create main product
        const productMain = await prisma.product.create({
          data: {
            name: product.name,
            shortDescription: (product as any).shortDescription || '',
            price: product.price,
            image: (product as any).image || '',
            createdBy,
            updatedBy: createdBy,
            rating: 0,
            reviewsCount: 0,
            views: 0,
          } as any,
        });

        // Create basic tab with legacy data
        const basicData = {
          productId: productMain.id,
          category: product.categoryId,
          brand: '', // Not available in legacy
          weight: null, // Not available in new Product model
          gender: '', // Not available in legacy
          size: '', // Not available in legacy
          colors: null, // Not available in new Product model
          colorName: '', // Not available in legacy
          description: (product as any).shortDescription,
          tagNumber: '', // Not available in legacy
          stock: null, // Not available in new Product model
          tags: null, // Not available in new Product model
          slug: '', // Not available in legacy
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          publishedAt: product.createdAt?.toISOString(),
          isSignaturePiece: false,
          isFeatured: false, // Not available in new Product model
          signatureLabel: '', // Not available in legacy
          signatureStory: '', // Not available in legacy
          allowBackorder: false,
          isPreorder: false,
          minOrderQty: null, // Not available in new Product model
          maxOrderQty: '', // Not available in legacy
          leadTimeDays: '', // Not available in legacy
          hsCode: '', // Not available in legacy
          warrantyInfo: '', // Not available in legacy
          badges: null,
          sales: '0',
          quantity: null, // Not available in new Product model
          reviewUi: '', // Not available in legacy
          soldUi: '', // Not available in legacy
          createdBy,
          updatedBy: createdBy,
        };

        const basic = await (prisma as any).productBasic.create({
          data: basicData,
        });

        // Create pricing tab
        const pricingData = {
          productId: productMain.id,
          price: product.price?.toString(),
          priceUSD: product.price?.toString(),
          currency: 'USD',
          discount: '0',
          discountType: 'PERCENTAGE',
          compareAtPrice: null, // Not available in new Product model
          saleStartAt: null,
          saleEndAt: null,
          discountLabel: '',
          tax: '0',
          createdBy,
          updatedBy: createdBy,
        };

        const pricing = await (prisma as any).productPricing.create({
          data: pricingData,
        });

        // Create media tab
        const mediaData = {
          productId: productMain.id,
          images: (product as any).image,
          videoFile: null,
          createdBy,
          updatedBy: createdBy,
        };

        const media = await (prisma as any).productMedia.create({
          data: mediaData,
        });

        // Create inventory tab
        const inventoryData = {
          productId: productMain.id,
          sku: null, // Not available in new Product model
          barcode: null, // Not available in new Product model
          inventoryQuantity: null, // Not available in new Product model
          lowStockThreshold: null, // Not available in new Product model
          reorderPoint: null, // Not available in new Product model
          reorderQuantity: '10',
          supplier: '', // Not available in legacy
          supplierSku: '', // Not available in legacy
          costPrice: null, // Not available in new Product model
          margin: '', // Not available in legacy
          location: '', // Not available in legacy
          warehouse: '', // Not available in legacy
          binLocation: '', // Not available in legacy
          lastRestocked: null,
          nextRestockDate: null,
          inventoryStatus: 'IN_STOCK',
          trackInventory: true,
          reservedQuantity: '0',
          availableQuantity: null, // Not available in new Product model
          createdBy,
          updatedBy: createdBy,
        };

        const inventory = await (prisma as any).productInventory.create({
          data: inventoryData,
        });

        return { productMain, basic, pricing, media, inventory };
      });

      this.logger.log('Legacy product migrated successfully', { 
        legacyProductId, 
        newProductId: result.productMain.id,
        productName: result.productMain.name 
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to migrate legacy product', error.stack, { legacyProductId });
      throw new InternalServerErrorException('Failed to migrate legacy product: ' + error.message);
    }
  }

  /**
   * Update a specific child tab
   */
  async updateChild(productId: string, updateChildDto: UpdateChildDto) {
    try {
      this.logger.log('Updating child tab', { productId, tabName: updateChildDto.tabName });

      // Check if product exists in new tab-based structure (productMain)
      let product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      let isLegacyProduct = false;
      
      // If not found in productMain, check legacy products table
      if (!product) {
        product = await this.prisma.product.findFirst({
          where: { id: productId },
        });
        
        if (product) {
          isLegacyProduct = true;
          this.logger.log('Product found in legacy table, tab updates not supported for legacy products', { productId });
          throw new BadRequestException('Tab updates are only supported for products created with the new tab-based structure. Legacy products need to be migrated first.');
        }
      }

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Update based on tab name
      let result;
      let updateData = {
        ...updateChildDto.data,
        updatedBy: updateChildDto.updatedBy,
        updatedAt: new Date(),
      };

      // Check for duplicate slug if updating basic tab with slug
      if (updateChildDto.tabName === 'basic' && updateChildDto.data?.slug) {
        const existingProductBySlug = await (this.prisma as any).productBasic.findFirst({
          where: {
            slug: updateChildDto.data.slug,
            productId: { not: productId } // Exclude current product
          }
        });

        if (existingProductBySlug) {
          throw new ConflictException(`Product slug "${updateChildDto.data.slug}" already exists`);
        }
      }

      // Map DTO fields to Prisma schema field names based on tab
      if (updateChildDto.tabName === 'basic') {
        const mappedData = {
          ...updateChildDto.data,
          category: updateChildDto.data?.categoryId, // Map categoryId to category
          collection: updateChildDto.data?.collectionId, // Map collectionId to collection
          weight: updateChildDto.data?.weight?.toString(),
          stock: updateChildDto.data?.stock?.toString(),
          minOrderQty: updateChildDto.data?.minOrderQty?.toString(),
          maxOrderQty: updateChildDto.data?.maxOrderQty?.toString(),
          leadTimeDays: updateChildDto.data?.leadTimeDays?.toString(),
          sales: updateChildDto.data?.sales?.toString(),
          quantity: updateChildDto.data?.quantity?.toString(),
          // Convert array fields to JSON strings
          colors: updateChildDto.data?.colors ? JSON.stringify(updateChildDto.data.colors) : undefined,
          tags: updateChildDto.data?.tags ? JSON.stringify(updateChildDto.data.tags) : undefined,
          badges: updateChildDto.data?.badges ? JSON.stringify(updateChildDto.data.badges) : undefined,
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        // Remove the original field names that were mapped
        delete mappedData.categoryId;
        delete mappedData.collectionId;
        
        updateData = mappedData;
      } else if (updateChildDto.tabName === 'media') {
        const mappedData = {
          ...updateChildDto.data,
          // Convert array fields to JSON strings
          images: updateChildDto.data?.images ? JSON.stringify(updateChildDto.data.images) : undefined,
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        updateData = mappedData;
      } else if (updateChildDto.tabName === 'pricing') {
        const mappedData = {
          ...updateChildDto.data,
          price: updateChildDto.data?.price?.toString(),
          priceUSD: updateChildDto.data?.priceUSD?.toString(),
          discount: updateChildDto.data?.discount?.toString(),
          compareAtPrice: updateChildDto.data?.compareAtPrice?.toString(),
          tax: updateChildDto.data?.tax?.toString(),
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        updateData = mappedData;
      } else if (updateChildDto.tabName === 'inventory') {
        const mappedData = {
          ...updateChildDto.data,
          inventoryQuantity: updateChildDto.data?.inventoryQuantity?.toString(),
          lowStockThreshold: updateChildDto.data?.lowStockThreshold?.toString(),
          reorderPoint: updateChildDto.data?.reorderPoint?.toString(),
          reorderQuantity: updateChildDto.data?.reorderQuantity?.toString(),
          costPrice: updateChildDto.data?.costPrice?.toString(),
          margin: updateChildDto.data?.margin?.toString(),
          reservedQuantity: updateChildDto.data?.reservedQuantity?.toString(),
          availableQuantity: updateChildDto.data?.availableQuantity?.toString(),
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        updateData = mappedData;
      } else if (updateChildDto.tabName === 'reels') {
        const mappedData = {
          ...updateChildDto.data,
          durationSec: updateChildDto.data?.durationSec?.toString(),
          reelOrder: updateChildDto.data?.reelOrder?.toString(),
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        updateData = mappedData;
      } else if (updateChildDto.tabName === 'shippingPolicies') {
        const mappedData = {
          ...updateChildDto.data,
          returnWindowDays: updateChildDto.data?.returnWindowDays?.toString(),
          returnFees: updateChildDto.data?.returnFees?.toString(),
          warrantyPeriodMonths: updateChildDto.data?.warrantyPeriodMonths?.toString(),
          weightKg: updateChildDto.data?.weightKg?.toString(),
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        updateData = mappedData;
      } else if (updateChildDto.tabName === 'itemDetails') {
        // Parse trustBadges JSON and split into individual trust badge fields
        let trustBadge1, trustBadge2, trustBadge3;
        if (updateChildDto.data?.trustBadges) {
          try {
            const badges = JSON.parse(updateChildDto.data.trustBadges);
            if (Array.isArray(badges)) {
              trustBadge1 = badges[0] ? JSON.stringify(badges[0]) : null;
              trustBadge2 = badges[1] ? JSON.stringify(badges[1]) : null;
              trustBadge3 = badges[2] ? JSON.stringify(badges[2]) : null;
            }
          } catch (error) {
            // If parsing fails, treat as single badge
            trustBadge1 = updateChildDto.data.trustBadges;
          }
        }

        const mappedData = {
          ...updateChildDto.data,
          trustBadge1: trustBadge1,
          trustBadge2: trustBadge2,
          trustBadge3: trustBadge3,
          updatedBy: updateChildDto.updatedBy,
          updatedAt: new Date(),
        };
        
        // Remove the original trustBadges field
        delete mappedData.trustBadges;
        
        updateData = mappedData;
      }

      switch (updateChildDto.tabName) {
        case 'basic':
          result = await (this.prisma as any).productBasic.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'pricing':
          result = await (this.prisma as any).productPricing.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'media':
          result = await (this.prisma as any).productMedia.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'seo':
          result = await (this.prisma as any).productSeo.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        // Association case removed - no longer needed

        case 'attributesTag':
          result = await (this.prisma as any).productAttributesTag.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'variants':
          result = await (this.prisma as any).productVariants.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'inventory':
          result = await (this.prisma as any).productInventory.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'reels':
          result = await (this.prisma as any).productReels.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'itemDetails':
          result = await (this.prisma as any).productItemDetails.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        case 'shippingPolicies':
          result = await (this.prisma as any).productShippingPolicies.upsert({
            where: { productId },
            update: updateData,
            create: {
              productId,
              ...updateData,
              createdBy: updateChildDto.updatedBy,
            },
          });
          break;

        default:
          throw new BadRequestException(`Invalid tab name: ${updateChildDto.tabName}`);
      }

      this.logger.log('Child tab updated successfully', { 
        productId, 
        tabName: updateChildDto.tabName,
        tabId: result.id 
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update child tab', error.stack, { productId, tabName: updateChildDto.tabName });
      throw new InternalServerErrorException('Failed to update child tab: ' + error.message);
    }
  }

  /**
   * Update specific tab by tab ID
   */
  async updateTabById(tabId: string, updateData: any, updatedBy: string) {
    try {
      this.logger.log('Updating tab by ID', { tabId });

      // Add update metadata
      const dataWithMetadata = {
        ...updateData,
        updatedBy,
        updatedAt: new Date(),
      };

      // Field to table mapping
      const fieldToTableMap = {
        // Basic tab fields
        'brand': 'productBasic',
        'categoryId': 'productBasic',
        'collectionId': 'productBasic',
        'signaturePieceId': 'productBasic',
        'weight': 'productBasic',
        'gender': 'productBasic',
        'size': 'productBasic',
        'colors': 'productBasic',
        'colorName': 'productBasic',
        'description': 'productBasic',
        'tagNumber': 'productBasic',
        'stock': 'productBasic',
        'tags': 'productBasic',
        'slug': 'productBasic',
        'status': 'productBasic',
        'visibility': 'productBasic',
        'publishedAt': 'productBasic',
        'isSignaturePiece': 'productBasic',
        'isFeatured': 'productBasic',
        'signatureLabel': 'productBasic',
        'signatureStory': 'productBasic',
        'allowBackorder': 'productBasic',
        'isPreorder': 'productBasic',
        'minOrderQty': 'productBasic',
        'maxOrderQty': 'productBasic',
        'leadTimeDays': 'productBasic',
        'hsCode': 'productBasic',
        'warrantyInfo': 'productBasic',
        'badges': 'productBasic',
        'sales': 'productBasic',
        'quantity': 'productBasic',
        'reviewUi': 'productBasic',
        'soldUi': 'productBasic',

        // Pricing tab fields
        'price': 'productPricing',
        'priceUSD': 'productPricing',
        'currency': 'productPricing',
        'discount': 'productPricing',
        'discountType': 'productPricing',
        'compareAtPrice': 'productPricing',
        'saleStartAt': 'productPricing',
        'saleEndAt': 'productPricing',
        'discountLabel': 'productPricing',
        'tax': 'productPricing',

        // Media tab fields
        'images': 'productMedia',
        'videoFile': 'productMedia',

        // SEO tab fields
        'seoTitle': 'productSeo',
        'seoDescription': 'productSeo',
        'canonicalUrl': 'productSeo',
        'ogImage': 'productSeo',

        // Attributes & Tags tab fields
        'attributes': 'productAttributesTag',

        // Variants tab fields
        'variants': 'productVariants',

        // Inventory tab fields
        'sku': 'productInventory',
        'barcode': 'productInventory',
        'inventoryQuantity': 'productInventory',
        'lowStockThreshold': 'productInventory',
        'reorderPoint': 'productInventory',
        'reorderQuantity': 'productInventory',
        'supplier': 'productInventory',
        'supplierSku': 'productInventory',
        'costPrice': 'productInventory',
        'margin': 'productInventory',
        'location': 'productInventory',
        'warehouse': 'productInventory',
        'binLocation': 'productInventory',
        'lastRestocked': 'productInventory',
        'nextRestockDate': 'productInventory',
        'inventoryStatus': 'productInventory',
        'trackInventory': 'productInventory',
        'reservedQuantity': 'productInventory',
        'availableQuantity': 'productInventory',

        // Reels tab fields
        'platform': 'productReels',
        'reelTitle': 'productReels',
        'reelDescription': 'productReels',
        'reelLanguage': 'productReels',
        'captionsUrl': 'productReels',
        'thumbnailUrl': 'productReels',
        'durationSec': 'productReels',
        'aspectRatio': 'productReels',
        'ctaUrl': 'productReels',
        'reelTags': 'productReels',
        'isPublic': 'productReels',
        'isPinned': 'productReels',
        'reelOrder': 'productReels',

        // Item Details tab fields
        'material': 'productItemDetails',
        'warranty': 'productItemDetails',
        'certification': 'productItemDetails',
        'vendorName': 'productItemDetails',
        'shippingFreeText': 'productItemDetails',
        'qualityGuaranteeText': 'productItemDetails',
        'careInstructionsText': 'productItemDetails',
        'didYouKnow': 'productItemDetails',
        'faqs': 'productItemDetails',
        'sellerBlurb': 'productItemDetails',
        'trustBadges': 'productItemDetails',

        // Shipping & Policies tab fields
        'shippingInfo': 'productShippingPolicies',
        'shippingNotes': 'productShippingPolicies',
        'packagingDetails': 'productShippingPolicies',
        'returnPolicy': 'productShippingPolicies',
        'returnWindowDays': 'productShippingPolicies',
        'returnFees': 'productShippingPolicies',
        'isReturnable': 'productShippingPolicies',
        'exchangePolicy': 'productShippingPolicies',
        'warrantyPeriodMonths': 'productShippingPolicies',
        'warrantyType': 'productShippingPolicies',
        'originCountry': 'productShippingPolicies',
        'weightKg': 'productShippingPolicies',
        'dimensions': 'productShippingPolicies'
      };

      // Determine which table to update based on the fields provided
      const fieldsToUpdate = Object.keys(updateData);
      const tableNames = new Set();
      
      fieldsToUpdate.forEach(field => {
        const tableName = fieldToTableMap[field];
        if (tableName) {
          tableNames.add(tableName);
        }
      });

      // If no specific table found, try all tables (fallback)
      if (tableNames.size === 0) {
        const tabTables = [
          'productBasic',
          'productPricing', 
          'productMedia',
          'productSeo',
          'productAttributesTag',
          'productVariants',
          'productInventory',
          'productReels',
          'productItemDetails',
          'productShippingPolicies'
        ];

        for (const tableName of tabTables) {
          try {
            const result = await (this.prisma as any)[tableName as string].update({
              where: { id: tabId },
              data: dataWithMetadata,
            });
            
            this.logger.log('Tab updated successfully by ID (fallback)', { tabId, tableName });
            return result;
          } catch (error) {
            // Continue to next table if this one doesn't have the record
            if (error.code === 'P2025') { // Record not found
              continue;
            }
            throw error;
          }
        }
      } else {
        // Update specific table(s) based on field mapping
        for (const tableName of Array.from(tableNames)) {
          try {
            // Filter data to only include fields that belong to this table
            const filteredData = {};
            fieldsToUpdate.forEach(field => {
              if (fieldToTableMap[field] === tableName) {
                filteredData[field] = dataWithMetadata[field];
              }
            });

            // Add metadata
            filteredData['updatedBy'] = updatedBy;
            filteredData['updatedAt'] = new Date();

            const result = await (this.prisma as any)[tableName as string].update({
              where: { id: tabId },
              data: filteredData,
            });
            
            this.logger.log('Tab updated successfully by ID', { tabId, tableName, fields: Object.keys(filteredData) });
            return result;
          } catch (error) {
            if (error.code === 'P2025') { // Record not found
              continue;
            }
            throw error;
          }
        }
      }

      throw new NotFoundException(`Tab with ID ${tabId} not found`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update tab by ID', error.stack, { tabId });
      throw new InternalServerErrorException('Failed to update tab: ' + error.message);
    }
  }

  /**
   * Update main product by product ID
   */
  async updateMainProduct(productId: string, updateData: any, updatedBy: string) {
    try {
      this.logger.log('Updating main product', { productId });

      // Add update metadata
      const dataWithMetadata = {
        ...updateData,
        updatedBy,
        updatedAt: new Date(),
      };

      // Update main product table
      const result = await this.prisma.product.update({
        where: { id: productId },
        data: dataWithMetadata,
      });

      this.logger.log('Main product updated successfully', { productId });
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update main product', error.stack, { productId });
      throw new InternalServerErrorException('Failed to update main product: ' + error.message);
    }
  }

  /**
   * Get all products for main screen (selective fields only)
   */
  async getAllProducts() {
    try {
      this.logger.debug('Fetching all products for main screen');
      
      const products = await this.prisma.product.findMany({
        select: {
          id: true,
          name: true,
          shortDescription: true,
          price: true,
          image: true,
          rating: true,
          reviewsCount: true,
          views: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
        } as any,
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log('Products fetched successfully for main screen', { count: products.length });
      return products;
    } catch (error) {
      this.logger.error('Failed to fetch products for main screen', error.stack);
      throw new InternalServerErrorException('Failed to fetch products: ' + error.message);
    }
  }

  /**
   * Get specific tab data for a product
   */
  async getProductTab(productId: string, tabName: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      if (!tabName || tabName.trim() === '') {
        throw new BadRequestException('Tab name is required');
      }

      // Validate tab name
      const validTabs = ['basic', 'pricing', 'media', 'seo', 'attributesTag', 'variants', 'inventory', 'reels', 'itemDetails', 'shippingPolicies'];
      if (!validTabs.includes(tabName)) {
        throw new BadRequestException(`Invalid tab name: ${tabName}. Valid tabs are: ${validTabs.join(', ')}`);
      }

      this.logger.debug('Fetching product tab data', { productId, tabName });

      // Check if product exists in new tab-based structure (productMain)
      let product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true }
      });

      let isLegacyProduct = false;
      
      // If not found in productMain, check legacy products table
      if (!product) {
        product = await this.prisma.product.findFirst({
          where: { id: productId },
          select: { id: true, name: true }
        });
        
        if (product) {
          isLegacyProduct = true;
          this.logger.log('Product found in legacy table, converting to tab format', { productId });
        }
      }

      if (!product) {
        this.logger.warn('Product not found in both new and legacy tables', { productId });
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get the specific tab data
      let tabData;
      
      if (isLegacyProduct) {
        // For legacy products, return null or empty data since they don't have tab structure
        this.logger.log('Legacy product has no tab structure', { productId, tabName });
        return null;
      }
      
      switch (tabName) {
        case 'basic':
          tabData = await (this.prisma as any).productBasic.findUnique({
            where: { productId }
          });
          break;
        case 'pricing':
          tabData = await (this.prisma as any).productPricing.findUnique({
            where: { productId }
          });
          break;
        case 'media':
          tabData = await (this.prisma as any).productMedia.findUnique({
            where: { productId }
          });
          break;
        case 'seo':
          tabData = await (this.prisma as any).productSeo.findUnique({
            where: { productId }
          });
          break;
        case 'attributesTag':
          tabData = await (this.prisma as any).productAttributesTag.findUnique({
            where: { productId }
          });
          break;
        case 'variants':
          tabData = await (this.prisma as any).productVariants.findUnique({
            where: { productId }
          });
          break;
        case 'inventory':
          tabData = await (this.prisma as any).productInventory.findUnique({
            where: { productId }
          });
          break;
        case 'reels':
          tabData = await (this.prisma as any).productReels.findUnique({
            where: { productId }
          });
          break;
        case 'itemDetails':
          tabData = await (this.prisma as any).productItemDetails.findUnique({
            where: { productId }
          });
          break;
        case 'shippingPolicies':
          tabData = await (this.prisma as any).productShippingPolicies.findUnique({
            where: { productId }
          });
          break;
        default:
          throw new BadRequestException(`Invalid tab name: ${tabName}`);
      }

      this.logger.log('Product tab data fetched successfully', { 
        productId, 
        tabName,
        hasData: !!tabData,
        isLegacyProduct
      });

      return tabData;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to fetch product tab data', error.stack, { productId, tabName });
      throw new InternalServerErrorException('Failed to fetch product tab data: ' + error.message);
    }
  }

  /**
   * Get full product detail including all child tabs
   */
  async getProductFullDetail(productId: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.debug('Fetching full product detail', { productId });

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          basic: true,
          pricing: true,
          media: true,
          seo: true,
          // association removed
          attributesTag: true,
          variants: true,
          inventory: true,
          reels: true,
          itemDetails: true,
          shippingPolicies: true,
        } as any,
      });

      if (!product) {
        this.logger.warn('Product not found', { productId });
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      this.logger.log('Full product detail fetched successfully', { 
        productId, 
        name: product.name 
      });

      return product;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to fetch full product detail', error.stack, { productId });
      throw new InternalServerErrorException('Failed to fetch product detail: ' + error.message);
    }
  }

  // Separate methods for read-only fields updates
  async updateRating(productId: string, rating: number) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      if (rating < 0 || rating > 5) {
        throw new BadRequestException('Rating must be between 0 and 5');
      }

      this.logger.log('Updating product rating', { productId, rating });

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: { rating } as any,
      });

      this.logger.log('Product rating updated successfully', { productId, rating });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update product rating', error.stack, { productId, rating });
      throw new InternalServerErrorException('Failed to update product rating: ' + error.message);
    }
  }

  async updateReviewsCount(productId: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Updating product reviews count', { productId });

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Count all active reviews for this product
      const reviewsCount = await this.prisma.review.count({
        where: {
          productId: productId,
          isActive: true,
          isDeleted: false,
        },
      });

      // Update the product with the actual count
      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: { reviewsCount } as any,
      });

      this.logger.log('Product reviews count updated successfully', { productId, reviewsCount });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update product reviews count', error.stack, { productId });
      throw new InternalServerErrorException('Failed to update product reviews count: ' + error.message);
    }
  }

  async incrementViews(productId: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Incrementing product views count', { productId });

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Increment views by 1
      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: {
          views: {
            increment: 1,
          },
        } as any,
      });

      this.logger.log('Product views count incremented successfully', { productId, newViews: updatedProduct.views });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to increment product views count', error.stack, { productId });
      throw new InternalServerErrorException('Failed to increment product views count: ' + error.message);
    }
  }

  // ==================== REVIEW METHODS ====================

  async getProductReviews(productId: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Fetching reviews for product', { productId });

      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Fetch all active reviews for this product
      const reviews = await this.prisma.review.findMany({
        where: {
          productId: productId,
          isActive: true,
          isDeleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log('Fetched reviews for product successfully', { productId, count: reviews.length });
      return reviews;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to fetch reviews for product', error.stack, { productId });
      throw new InternalServerErrorException('Failed to fetch reviews: ' + error.message);
    }
  }

  async createReview(productId: string, userId: string, rating: number, title?: string, comment?: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      if (!userId || userId.trim() === '') {
        throw new BadRequestException('User ID is required');
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      this.logger.log('Creating review', { productId, userId, rating });

      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Check if user already reviewed this product
      const existingReview = await this.prisma.review.findUnique({
        where: {
          userId_productId: {
            userId: userId,
            productId: productId,
          },
        },
      });

      if (existingReview) {
        throw new ConflictException('User has already reviewed this product');
      }

      // Create the review
      const review = await this.prisma.review.create({
        data: {
          userId,
          productId,
          rating,
          title,
          comment,
          createdBy: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });

      // Update product rating and reviews count
      await this.updateReviewsCount(productId);
      
      // Calculate and update average rating
      const reviews = await this.getProductReviews(productId);
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      await this.prisma.product.update({
        where: { id: productId },
        data: { rating: averageRating } as any,
      });

      this.logger.log('Review created successfully', { reviewId: review.id, productId, userId });
      return review;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create review', error.stack, { productId, userId });
      throw new InternalServerErrorException('Failed to create review: ' + error.message);
    }
  }

  // ==================== FILTERING METHODS ====================

  async getProductsWithFilters(queryDto: any) {
    try {
      this.logger.log('Fetching products with filters', { filters: queryDto });

      // Validate and normalize query parameters
      const {
        search,
        categoryId,
        collectionId,
        signaturePieceId,
        vendorId,
        storeId,
        tags,
        tag,
        minPrice,
        maxPrice,
        signaturePieces,
        featured,
        active,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = queryDto;

      // Validate pagination parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100); // Max 100 items per page

      // Validate price range
      if (minPrice !== undefined && (isNaN(minPrice) || minPrice < 0)) {
        throw new BadRequestException('Minimum price must be a non-negative number');
      }
      if (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0)) {
        throw new BadRequestException('Maximum price must be a non-negative number');
      }
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        throw new BadRequestException('Minimum price cannot be greater than maximum price');
      }

      // Validate sort parameters
      const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'price', 'rating', 'views', 'reviewsCount'];
      const validatedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const validatedSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

      this.logger.log('Validated filter parameters', {
        search: search || null,
        categoryId: categoryId || null,
        collectionId: collectionId || null,
        tags: tags || null,
        tag: tag || null,
        priceRange: minPrice !== undefined || maxPrice !== undefined ? `${minPrice || 0}-${maxPrice || '∞'}` : null,
        signaturePieces: signaturePieces !== undefined ? signaturePieces : null,
        featured: featured !== undefined ? featured : null,
        active: active !== undefined ? active : null,
        sortBy: validatedSortBy,
        sortOrder: validatedSortOrder,
        page: validatedPage,
        limit: validatedLimit,
        // Debug: Show raw parameter types
        debugTypes: {
          signaturePiecesType: typeof signaturePieces,
          featuredType: typeof featured,
          activeType: typeof active,
          signaturePiecesValue: signaturePieces,
          featuredValue: featured,
          activeValue: active
        }
      });

      // Build comprehensive where clause with proper joins
      const where: any = {
        isDeleted: false
        // Note: isActive filter will be handled in post-query filtering for better control
      };

      // Enhanced search filter - search across multiple fields
      if (search) {
        const searchTerm = search.trim();
        this.logger.log('Applying search filter', { searchTerm });
        
        where.OR = [
          // Search in main product fields
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
          
          // Search in product basic fields
          { 
            basic: {
              description: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          { 
            basic: {
              brand: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          { 
            basic: {
              colorName: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          { 
            basic: {
              slug: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          
          // Search in tags (both basic and attributes)
          { 
            basic: {
              tags: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          { 
            attributesTag: {
              tags: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          
          // Search in category and collection (by name, not just ID)
          { 
            basic: {
              category: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          { 
            basic: {
              collection: { contains: searchTerm, mode: 'insensitive' }
            }
          }
        ];
      }

      // Direct product table filters
      if (categoryId) {
        // For category filtering, we need to check both main table and basic table
        // This will be handled in post-query filtering for better performance
      }

      if (vendorId) {
        where.vendorId = vendorId;
      }

      if (storeId) {
        where.storeId = storeId;
      }

      // Price filters
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) {
          where.price.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.price.lte = maxPrice;
        }
      }

      // Active filter - handle both true and false values
      if (active !== undefined) {
        where.isActive = active === true || active === 'true';
      }

      // Build orderBy clause
      const orderBy: any = {};
      orderBy[validatedSortBy] = validatedSortOrder;

      // For complex filters, fetch all products first, then filter
      // This is necessary because some filters require joins that Prisma doesn't handle well
      const products = await this.prisma.product.findMany({
        where,
        orderBy,
        include: {
          basic: true,
          pricing: true,
          attributesTag: true,
          media: true,
          seo: true,
          variants: true,
          inventory: true,
          reels: true,
          itemDetails: true,
          shippingPolicies: true
        } as any
      });

      // Apply additional filters that require complex joins
      let filteredProducts = products;

      // Category filter (check both main table and basic table)
      if (categoryId) {
        filteredProducts = filteredProducts.filter(product => 
          product.categoryId === categoryId || 
          (product as any).basic?.category === categoryId
        );
      }

      // Collection filter (from basic table)
      if (collectionId) {
        filteredProducts = filteredProducts.filter(product => 
          (product as any).basic?.collection === collectionId
        );
      }

      // Signature piece filters - focus on ProductBasic table
      if (signaturePieceId || signaturePieces !== undefined) {
        const signatureValue = signaturePieces === true || signaturePieces === 'true';
        const beforeCount = filteredProducts.length;
        
        // Debug: Log sample product signature values before filtering
        const sampleProducts = filteredProducts.slice(0, 3).map(p => ({
          id: (p as any).id,
          name: (p as any).name,
          basicSignaturePiece: (p as any).basic?.isSignaturePiece,
          mainSignaturePiece: (p as any).isSignaturePiece
        }));
        
        filteredProducts = filteredProducts.filter(product => {
          // Check ProductBasic table for isSignaturePiece
          const basicSignaturePiece = (product as any).basic?.isSignaturePiece;
          
          // If basic table has the field, use it
          if (basicSignaturePiece !== undefined && basicSignaturePiece !== null) {
            return basicSignaturePiece === signatureValue;
          }
          
          // If no basic data or field is null/undefined, exclude from results
          // This ensures we only show products with explicit signature piece status
          return false;
        });
        
        this.logger.log('Signature pieces filter applied', {
          signatureValue,
          beforeCount,
          afterCount: filteredProducts.length,
          filteredOut: beforeCount - filteredProducts.length,
          sampleProductsBeforeFilter: sampleProducts
        });
      }

      // Featured filter - focus on ProductBasic table
      if (featured !== undefined) {
        const featuredValue = featured === true || featured === 'true';
        const beforeCount = filteredProducts.length;
        
        // Debug: Log sample product featured values before filtering
        const sampleProducts = filteredProducts.slice(0, 3).map(p => ({
          id: (p as any).id,
          name: (p as any).name,
          basicFeatured: (p as any).basic?.isFeatured,
          mainFeatured: (p as any).isFeatured
        }));
        
        filteredProducts = filteredProducts.filter(product => {
          // Check ProductBasic table for isFeatured
          const basicFeatured = (product as any).basic?.isFeatured;
          
          // If basic table has the field, use it
          if (basicFeatured !== undefined && basicFeatured !== null) {
            return basicFeatured === featuredValue;
          }
          
          // If no basic data or field is null/undefined, exclude from results
          // This ensures we only show products with explicit featured status
          return false;
        });
        
        this.logger.log('Featured filter applied', {
          featuredValue,
          beforeCount,
          afterCount: filteredProducts.length,
          filteredOut: beforeCount - filteredProducts.length,
          sampleProductsBeforeFilter: sampleProducts
        });
      }

      // Active filter - focus on ProductBasic table
      // Default to active products if no active parameter is provided
      const activeValue = active !== undefined ? (active === true || active === 'true') : true;
      const beforeCount = filteredProducts.length;
      
      filteredProducts = filteredProducts.filter(product => {
        // Check ProductBasic table for isActive
        const basicActive = (product as any).basic?.isActive;
        
        // If basic table has the field, use it
        if (basicActive !== undefined && basicActive !== null) {
          return basicActive === activeValue;
        }
        
        // Fallback to main product table if basic table doesn't have the field
        const mainActive = (product as any).isActive;
        if (mainActive !== undefined && mainActive !== null) {
          return mainActive === activeValue;
        }
        
        // If no active status found, exclude from results
        return false;
      });
      
      this.logger.log('Active filter applied', {
        activeValue,
        beforeCount,
        afterCount: filteredProducts.length,
        filteredOut: beforeCount - filteredProducts.length
      });

      // Enhanced search filter - post-query filtering for complex searches
      if (search) {
        const searchTerm = search.trim().toLowerCase();
        const beforeCount = filteredProducts.length;
        
        filteredProducts = filteredProducts.filter(product => {
          // Check if already matched by Prisma query
          const productName = (product as any).name?.toLowerCase() || '';
          const shortDescription = (product as any).shortDescription?.toLowerCase() || '';
          const basicDescription = (product as any).basic?.description?.toLowerCase() || '';
          const brand = (product as any).basic?.brand?.toLowerCase() || '';
          const colorName = (product as any).basic?.colorName?.toLowerCase() || '';
          const slug = (product as any).basic?.slug?.toLowerCase() || '';
          const category = (product as any).basic?.category?.toLowerCase() || '';
          const collection = (product as any).basic?.collection?.toLowerCase() || '';
          
          // Check basic text fields
          if (productName.includes(searchTerm) || 
              shortDescription.includes(searchTerm) ||
              basicDescription.includes(searchTerm) ||
              brand.includes(searchTerm) ||
              colorName.includes(searchTerm) ||
              slug.includes(searchTerm) ||
              category.includes(searchTerm) ||
              collection.includes(searchTerm)) {
            return true;
          }
          
          // Check tags in ProductBasic table
          if ((product as any).basic?.tags) {
            try {
              const basicTags = JSON.parse((product as any).basic.tags);
              if (Array.isArray(basicTags)) {
                const hasTagMatch = basicTags.some((tag: string) => 
                  tag.toLowerCase().includes(searchTerm)
                );
                if (hasTagMatch) return true;
              }
            } catch (error) {
              // If JSON parsing fails, try string search
              const tagsString = (product as any).basic.tags.toLowerCase();
              if (tagsString.includes(searchTerm)) return true;
            }
          }
          
          // Check tags in ProductAttributesTag table
          if ((product as any).attributesTag?.tags) {
            try {
              const attributeTags = JSON.parse((product as any).attributesTag.tags);
              if (Array.isArray(attributeTags)) {
                const hasTagMatch = attributeTags.some((tag: string) => 
                  tag.toLowerCase().includes(searchTerm)
                );
                if (hasTagMatch) return true;
              }
            } catch (error) {
              // If JSON parsing fails, try string search
              const tagsString = (product as any).attributesTag.tags.toLowerCase();
              if (tagsString.includes(searchTerm)) return true;
            }
          }
          
          return false;
        });
        
        this.logger.log('Enhanced search filter applied', {
          searchTerm,
          beforeCount,
          afterCount: filteredProducts.length,
          filteredOut: beforeCount - filteredProducts.length
        });
      }

      // Tags filter (comma-separated)
      if (tags) {
        const tagList = tags.split(',').map((t: string) => t.trim().toLowerCase());
        filteredProducts = filteredProducts.filter(product => {
          let hasMatchingTag = false;

          // Check tags in ProductBasic table
          if ((product as any).basic?.tags) {
            try {
              const basicTags = JSON.parse((product as any).basic.tags);
              if (Array.isArray(basicTags)) {
                const basicTagMatches = basicTags.some((productTag: string) => 
                  tagList.some(searchTag => 
                    productTag.toLowerCase().includes(searchTag) || searchTag.includes(productTag.toLowerCase())
                  )
                );
                if (basicTagMatches) hasMatchingTag = true;
              }
          } catch (error) {
              this.logger.warn('Failed to parse basic tags in filter', { productId: product.id });
            }
          }

          // Check tags in ProductAttributesTag table
          if (!hasMatchingTag && (product as any).attributesTag?.tags) {
            try {
              const attributeTags = JSON.parse((product as any).attributesTag.tags);
              if (Array.isArray(attributeTags)) {
                const attributeTagMatches = attributeTags.some((productTag: string) => 
                  tagList.some(searchTag => 
                    productTag.toLowerCase().includes(searchTag) || searchTag.includes(productTag.toLowerCase())
                  )
                );
                if (attributeTagMatches) hasMatchingTag = true;
              }
            } catch (error) {
              this.logger.warn('Failed to parse attribute tags in filter', { productId: product.id });
            }
          }

          return hasMatchingTag;
        });
      }

      // Single tag filter
      if (tag) {
        const searchTag = tag.toLowerCase();
        filteredProducts = filteredProducts.filter(product => {
          let hasMatchingTag = false;

          // Check tags in ProductBasic table
          if ((product as any).basic?.tags) {
            try {
              const basicTags = JSON.parse((product as any).basic.tags);
              if (Array.isArray(basicTags)) {
                const basicTagMatches = basicTags.some((productTag: string) => 
                  productTag.toLowerCase().includes(searchTag) || searchTag.includes(productTag.toLowerCase())
                );
                if (basicTagMatches) hasMatchingTag = true;
              }
          } catch (error) {
              this.logger.warn('Failed to parse basic tags in single tag filter', { productId: product.id });
            }
          }

          // Check tags in ProductAttributesTag table
          if (!hasMatchingTag && (product as any).attributesTag?.tags) {
            try {
              const attributeTags = JSON.parse((product as any).attributesTag.tags);
              if (Array.isArray(attributeTags)) {
                const attributeTagMatches = attributeTags.some((productTag: string) => 
                  productTag.toLowerCase().includes(searchTag) || searchTag.includes(productTag.toLowerCase())
                );
                if (attributeTagMatches) hasMatchingTag = true;
              }
            } catch (error) {
              this.logger.warn('Failed to parse attribute tags in single tag filter', { productId: product.id });
            }
          }

          return hasMatchingTag;
        });
      }

      // Calculate pagination info based on filtered results
      const filteredTotalCount = filteredProducts.length;
      const totalPages = Math.ceil(filteredTotalCount / validatedLimit);
      const hasNextPage = validatedPage < totalPages;
      const hasPrevPage = validatedPage > 1;

      // Apply pagination to filtered results
      const startIndex = (validatedPage - 1) * validatedLimit;
      const endIndex = startIndex + validatedLimit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      this.logger.log('Products filtered successfully', { 
        totalCount: filteredTotalCount, 
        filteredCount: filteredProducts.length,
        paginatedCount: paginatedProducts.length,
        page: validatedPage,
        limit: validatedLimit,
        filters: {
          search,
          categoryId,
          collectionId,
          signaturePieces,
          featured,
          active,
          tags,
          tag,
          minPrice,
          maxPrice
        }
      });

      return {
        products: paginatedProducts,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          totalCount: filteredTotalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch products with filters', error.stack, { filters: queryDto });
      throw new InternalServerErrorException('Failed to fetch products with filters: ' + error.message);
    }
  }

  async getProductsByCategory(categoryId: string, queryDto: any = {}) {
    try {
      this.logger.log('Fetching products by category', { categoryId });

      // Validate category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, isActive: true, isDeleted: true }
      });

      if (!category) {
        this.logger.warn('Category not found', { categoryId });
        return {
          products: [],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          categoryInfo: {
            id: categoryId,
            name: 'Category Not Found',
            exists: false
          }
        };
      }

      if (category.isDeleted) {
        this.logger.warn('Category is deleted', { categoryId });
        return {
          products: [],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          categoryInfo: {
            id: categoryId,
            name: category.name,
            exists: true,
            isDeleted: true
          }
        };
      }

      const queryWithCategory = { ...queryDto, categoryId };
      const result = await this.getProductsWithFilters(queryWithCategory);
      
      // Add category info to response
      return {
        ...result,
        categoryInfo: {
          id: categoryId,
          name: category.name,
          exists: true,
          isActive: category.isActive
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch products by category', error.stack, { categoryId });
      throw new InternalServerErrorException('Failed to fetch products by category: ' + error.message);
    }
  }

  async getProductsByCollection(collectionId: string, queryDto: any = {}) {
    try {
      this.logger.log('Fetching products by collection', { collectionId });

      // Validate collection exists
      const collection = await this.prisma.collection.findUnique({
        where: { id: collectionId },
        select: { id: true, title: true, isActive: true, isDeleted: true }
      });

      if (!collection) {
        this.logger.warn('Collection not found', { collectionId });
        return {
          products: [],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          collectionInfo: {
            id: collectionId,
            title: 'Collection Not Found',
            exists: false
          }
        };
      }

      if (collection.isDeleted) {
        this.logger.warn('Collection is deleted', { collectionId });
        return {
          products: [],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          collectionInfo: {
            id: collectionId,
            title: collection.title,
            exists: true,
            isDeleted: true
          }
        };
      }

      const queryWithCollection = { ...queryDto, collectionId };
      const result = await this.getProductsWithFilters(queryWithCollection);
      
      // Add collection info to response
      return {
        ...result,
        collectionInfo: {
          id: collectionId,
          title: collection.title,
          exists: true,
          isActive: collection.isActive
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch products by collection', error.stack, { collectionId });
      throw new InternalServerErrorException('Failed to fetch products by collection: ' + error.message);
    }
  }

  async getSignaturePieces(queryDto: any = {}) {
    try {
      this.logger.log('Fetching signature pieces');

      const queryWithSignature = { ...queryDto, signaturePieces: true };
      return await this.getProductsWithFilters(queryWithSignature);
    } catch (error) {
      this.logger.error('Failed to fetch signature pieces', error.stack);
      throw new InternalServerErrorException('Failed to fetch signature pieces: ' + error.message);
    }
  }

  async getProductsByTags(tags: string, queryDto: any = {}) {
    try {
      this.logger.log('Fetching products by tags', { tags });

      // Parse comma-separated tags
      const tagList = tags.split(',').map((t: string) => t.trim().toLowerCase());
      
      const {
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = queryDto;

      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Fetch all products with their related tabs
      const products = await this.prisma.product.findMany({
        where: {
          isDeleted: false,
          isActive: true
        },
        include: {
          basic: true,
          attributesTag: true,
          pricing: true,
          media: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
              isVerified: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy
      });

      // Filter products by tags - check both basic.tags and attributesTag.tags
      const filteredProducts = products.filter(product => {
        let hasMatchingTag = false;

        // Check tags in ProductBasic table
        if (product.basic?.tags) {
          try {
            const basicTags = JSON.parse(product.basic.tags);
            if (Array.isArray(basicTags)) {
              const basicTagMatches = basicTags.some((tag: string) => 
                tagList.some(searchTag => 
                  tag.toLowerCase().includes(searchTag) || searchTag.includes(tag.toLowerCase())
                )
              );
              if (basicTagMatches) hasMatchingTag = true;
            }
          } catch (error) {
            this.logger.warn('Failed to parse basic tags', { productId: product.id, tags: product.basic.tags });
          }
        }

        // Check tags in ProductAttributesTag table
        if (!hasMatchingTag && product.attributesTag?.tags) {
          try {
            const attributeTags = JSON.parse(product.attributesTag.tags);
            if (Array.isArray(attributeTags)) {
              const attributeTagMatches = attributeTags.some((tag: string) => 
                tagList.some(searchTag => 
                  tag.toLowerCase().includes(searchTag) || searchTag.includes(tag.toLowerCase())
                )
              );
              if (attributeTagMatches) hasMatchingTag = true;
            }
          } catch (error) {
            this.logger.warn('Failed to parse attribute tags', { productId: product.id, tags: product.attributesTag.tags });
          }
        }

        return hasMatchingTag;
      });

      // Apply additional filters from queryDto
      let finalFilteredProducts = filteredProducts;

      // Apply other filters if provided
      if (queryDto.search) {
        const searchTerm = queryDto.search.toLowerCase();
        finalFilteredProducts = finalFilteredProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          (product.shortDescription && product.shortDescription.toLowerCase().includes(searchTerm))
        );
      }

      if (queryDto.minPrice !== undefined || queryDto.maxPrice !== undefined) {
        finalFilteredProducts = finalFilteredProducts.filter(product => {
          const price = product.price || 0;
          if (queryDto.minPrice !== undefined && price < queryDto.minPrice) return false;
          if (queryDto.maxPrice !== undefined && price > queryDto.maxPrice) return false;
          return true;
        });
      }

      if (queryDto.featured !== undefined) {
        finalFilteredProducts = finalFilteredProducts.filter(product => 
          product.basic?.isFeatured === queryDto.featured
        );
      }

      if (queryDto.signaturePieces !== undefined) {
        finalFilteredProducts = finalFilteredProducts.filter(product => 
          product.basic?.isSignaturePiece === queryDto.signaturePieces
        );
      }

      // Calculate pagination
      const totalCount = finalFilteredProducts.length;
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = finalFilteredProducts.slice(startIndex, endIndex);

      this.logger.log('Products filtered by tags successfully', { 
        tags: tagList,
        totalCount,
        filteredCount: finalFilteredProducts.length,
        paginatedCount: paginatedProducts.length,
        page,
        limit
      });

      return {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch products by tags', error.stack, { tags });
      throw new InternalServerErrorException('Failed to fetch products by tags: ' + error.message);
    }
  }

  async getProductsByPriceRange(minPrice: number, maxPrice: number, queryDto: any = {}) {
    try {
      this.logger.log('Fetching products by price range', { minPrice, maxPrice });

      const queryWithPrice = { ...queryDto, minPrice, maxPrice };
      return await this.getProductsWithFilters(queryWithPrice);
    } catch (error) {
      this.logger.error('Failed to fetch products by price range', error.stack, { minPrice, maxPrice });
      throw new InternalServerErrorException('Failed to fetch products by price range: ' + error.message);
    }
  }

  async searchProducts(searchTerm: string, queryDto: any = {}) {
    try {
      this.logger.log('Searching products', { searchTerm });

      const queryWithSearch = { ...queryDto, search: searchTerm };
      return await this.getProductsWithFilters(queryWithSearch);
    } catch (error) {
      this.logger.error('Failed to search products', error.stack, { searchTerm });
      throw new InternalServerErrorException('Failed to search products: ' + error.message);
    }
  }

  // ==================== MIGRATION METHODS ====================

  /**
   * Migrate existing products to ensure categoryId is properly assigned
   * This method updates products that have category in basic table but not in main table
   */
  async migrateProductCategoryAssignments() {
    try {
      this.logger.log('Starting product category assignment migration');

      const productsToUpdate = await this.prisma.product.findMany({
        where: {
          categoryId: null,
          isDeleted: false
        },
        include: {
          basic: true
        } as any
      });

      this.logger.log(`Found ${productsToUpdate.length} products without categoryId assignment`);

      let updatedCount = 0;
      for (const product of productsToUpdate) {
        if ((product as any).basic?.category) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: {
              categoryId: (product as any).basic.category,
              updatedBy: 'system-migration',
              updatedAt: new Date()
            }
          });
          updatedCount++;
          this.logger.log(`Updated product ${product.name} with categoryId: ${(product as any).basic.category}`);
        }
      }

      this.logger.log(`Migration completed: ${updatedCount} products updated`);
      return {
        totalProducts: productsToUpdate.length,
        updatedProducts: updatedCount,
        message: `Successfully migrated ${updatedCount} products with category assignments`
      };
    } catch (error) {
      this.logger.error('Failed to migrate product category assignments', error.stack);
      throw new InternalServerErrorException('Failed to migrate product category assignments: ' + error.message);
    }
  }

  // ==================== ENHANCED UPDATE METHODS ====================

  async updateMainProductWithPriceSync(productId: string, updateData: any, updatedBy: string) {
    try {
      this.logger.log('Updating main product with price synchronization', { productId, updateData });

      // Check if product exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { pricing: true } as any
      });

      if (!existingProduct) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Prepare update data with metadata
      const dataWithMetadata = {
        ...updateData,
        updatedBy,
        updatedAt: new Date(),
      };

      // Start transaction to update both main product and pricing
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update main product
        const updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: dataWithMetadata,
        });

        // If price is being updated, also update the pricing table
        if (updateData.price !== undefined) {
          if ((existingProduct as any).pricing) {
            // Update existing pricing record
            await prisma.productPricing.update({
              where: { productId },
              data: {
                price: updateData.price.toString(),
                priceUSD: updateData.price.toString(),
                updatedBy,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new pricing record if it doesn't exist
            await prisma.productPricing.create({
              data: {
                productId,
                price: updateData.price.toString(),
                priceUSD: updateData.price.toString(),
                currency: 'USD',
                createdBy: updatedBy,
                updatedBy,
              },
            });
          }
        }

        return updatedProduct;
      });

      this.logger.log('Main product updated with price synchronization', { 
        productId, 
        updatedFields: Object.keys(updateData),
        priceUpdated: updateData.price !== undefined
      });

      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update main product with price sync', error.stack, { productId });
      throw new InternalServerErrorException('Failed to update main product with price sync: ' + error.message);
    }
  }
}

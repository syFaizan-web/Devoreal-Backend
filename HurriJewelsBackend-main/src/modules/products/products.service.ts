import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductMainDto } from './dto/create-product-main.dto';
import { UpdateChildDto } from './dto/update-child.dto';

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

  // ===== NEW TAB-WISE PRODUCT METHODS =====

  /**
   * Create main product and all child tabs in one transaction
   */
  async createMain(createProductMainDto: CreateProductMainDto) {
    try {
      this.logger.log('Creating new product with tab-wise structure', { name: createProductMainDto.name });

      // Validate required fields
      if (!createProductMainDto.name || createProductMainDto.name.trim() === '') {
        throw new BadRequestException('Product name is required');
      }

      // Validate references if provided
      if (createProductMainDto.basic?.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: createProductMainDto.basic.categoryId, isDeleted: false }
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
      }

      if (createProductMainDto.basic?.collectionId) {
        const collection = await this.prisma.collection.findFirst({
          where: { id: createProductMainDto.basic.collectionId, isDeleted: false }
        });
        if (!collection) {
          throw new NotFoundException('Collection not found');
        }
      }

      if (createProductMainDto.basic?.signaturePieceId) {
        const signaturePiece = await this.prisma.signaturePiece.findFirst({
          where: { id: createProductMainDto.basic.signaturePieceId, isDeleted: false }
        });
        if (!signaturePiece) {
          throw new NotFoundException('Signature piece not found');
        }
      }

      const result = await this.prisma.$transaction(async (prisma) => {
        // Create main product with read-only fields initialized
        const productMain = await (prisma as any).productMain.create({
          data: {
            name: createProductMainDto.name,
            image: createProductMainDto.image,
            shortDescription: createProductMainDto.shortDescription,
            createdBy: createProductMainDto.createdBy,
            updatedBy: createProductMainDto.createdBy,
            // Initialize read-only fields
            rating: 0,
            reviewsCount: 0,
            views: 0,
          },
        });

        // Create child tabs if data provided
        const childTabs = [];

        if (createProductMainDto.basic) {
          const basic = await (prisma as any).productBasic.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.basic,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ basic });
        }

        if (createProductMainDto.pricing) {
          const pricing = await (prisma as any).productPricing.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.pricing,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ pricing });
        }

        if (createProductMainDto.media) {
          const media = await (prisma as any).productMedia.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.media,
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
              ...createProductMainDto.seo,
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
              ...createProductMainDto.attributesTag,
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
              ...createProductMainDto.variants,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ variants });
        }

        if (createProductMainDto.inventory) {
          const inventory = await (prisma as any).productInventory.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.inventory,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ inventory });
        }

        if (createProductMainDto.reels) {
          const reels = await (prisma as any).productReels.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.reels,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ reels });
        }

        if (createProductMainDto.itemDetails) {
          const itemDetails = await (prisma as any).productItemDetails.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.itemDetails,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
          });
          childTabs.push({ itemDetails });
        }

        if (createProductMainDto.shippingPolicies) {
          const shippingPolicies = await (prisma as any).productShippingPolicies.create({
            data: {
              productId: productMain.id,
              ...createProductMainDto.shippingPolicies,
              createdBy: createProductMainDto.createdBy,
              updatedBy: createProductMainDto.createdBy,
            },
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
   * Update a specific child tab
   */
  async updateChild(productId: string, updateChildDto: UpdateChildDto) {
    try {
      this.logger.log('Updating child tab', { productId, tabName: updateChildDto.tabName });

      // Validate product exists
      const product = await (this.prisma as any).productMain.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Update based on tab name
      let result;
      const updateData = {
        ...updateChildDto.data,
        updatedBy: updateChildDto.updatedBy,
        updatedAt: new Date(),
      };

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
   * Get all products for main screen (selective fields only)
   */
  async getAllProducts() {
    try {
      this.logger.debug('Fetching all products for main screen');
      
      const products = await (this.prisma as any).productMain.findMany({
        select: {
          id: true,
          name: true,
          image: true,
          shortDescription: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
        },
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
   * Get full product detail including all child tabs
   */
  async getProductFullDetail(productId: string) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.debug('Fetching full product detail', { productId });

      const product = await (this.prisma as any).productMain.findUnique({
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
        },
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

      const product = await (this.prisma as any).productMain.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const updatedProduct = await (this.prisma as any).productMain.update({
        where: { id: productId },
        data: { rating },
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

  async updateReviewsCount(productId: string, reviewsCount: number) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      if (reviewsCount < 0) {
        throw new BadRequestException('Reviews count must be non-negative');
      }

      this.logger.log('Updating product reviews count', { productId, reviewsCount });

      const product = await (this.prisma as any).productMain.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const updatedProduct = await (this.prisma as any).productMain.update({
        where: { id: productId },
        data: { reviewsCount },
      });

      this.logger.log('Product reviews count updated successfully', { productId, reviewsCount });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update product reviews count', error.stack, { productId, reviewsCount });
      throw new InternalServerErrorException('Failed to update product reviews count: ' + error.message);
    }
  }

  async updateViews(productId: string, views: number) {
    try {
      if (!productId || productId.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      if (views < 0) {
        throw new BadRequestException('Views count must be non-negative');
      }

      this.logger.log('Updating product views count', { productId, views });

      const product = await (this.prisma as any).productMain.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const updatedProduct = await (this.prisma as any).productMain.update({
        where: { id: productId },
        data: { views },
      });

      this.logger.log('Product views count updated successfully', { productId, views });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update product views count', error.stack, { productId, views });
      throw new InternalServerErrorException('Failed to update product views count: ' + error.message);
    }
  }
}

import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
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

  async create(createProductDto: CreateProductDto) {
    try {
      this.logger.log('Creating new product', { name: createProductDto.name, categoryId: createProductDto.categoryId });
      
      // Validate required fields using helper method
      this.validateRequiredFields(createProductDto, ['name', 'categoryId'], 'product creation');
      
      if (!createProductDto.price || createProductDto.price <= 0) {
        throw new BadRequestException('Valid product price is required');
      }

      // Check for duplicate product name
      const existingProductByName = await this.prisma.product.findFirst({
        where: {
          name: createProductDto.name,
          isDeleted: false
        }
      });

      if (existingProductByName) {
        throw new ConflictException(`Product name "${createProductDto.name}" already exists`);
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
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      if (error.code && error.code.startsWith('P')) {
        this.handlePrismaError(error, 'product creation', { name: createProductDto.name });
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
      
      // Check for duplicate product name if name is being updated
      if (updateProductDto.name && updateProductDto.name !== existingProduct.name) {
        const existingProductByName = await this.prisma.product.findFirst({
          where: {
            name: updateProductDto.name,
            isDeleted: false,
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
      const existingProductByName = await (this.prisma as any).productMain.findFirst({
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
            shortDescription: createProductMainDto.shortDescription,
            price: createProductMainDto.price,
            image: createProductMainDto.image,
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
   * Get all products for main screen (selective fields only)
   */
  async getAllProducts() {
    try {
      this.logger.debug('Fetching all products for main screen');
      
      const products = await (this.prisma as any).productMain.findMany({
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

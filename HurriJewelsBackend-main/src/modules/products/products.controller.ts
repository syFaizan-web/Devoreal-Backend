import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Param, 
  Query, 
  Body, 
  Req,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { ProductsService } from './products.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductMainDto } from './dto/create-product-main.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { ProductMainResponseDto, ProductFullResponseDto } from './dto/product-response.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Ownership } from '../../common/decorators/ownership.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all products for main screen (selective fields)' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductMainResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
  })
  async getAllProducts() {
    return this.productsService.getAllProducts();
  }

  // Legacy endpoint for backward compatibility
  @Get('legacy')
  @ApiOperation({ summary: 'Get all products (legacy endpoint)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'vendorId', required: false, type: String, description: 'Filter by vendor' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Product' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
  })
  async findAll(@Query() query: any) {
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full product detail including all child tabs' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductFullResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductFullDetail(@Param('id') id: string) {
    return this.productsService.getProductFullDetail(id);
  }

  // Legacy endpoint for backward compatibility
  @Get('legacy/:id')
  @ApiOperation({ summary: 'Get product by ID (legacy endpoint)' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    schema: { $ref: '#/components/schemas/Product' },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new product with tab-wise structure (Public Access)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        image: { type: 'string' },
        shortDescription: { type: 'string' },
        // Basic tab fields
        'basic[categoryId]': { type: 'string' },
        'basic[collectionId]': { type: 'string' },
        'basic[signaturePieceId]': { type: 'string' },
        'basic[brand]': { type: 'string' },
        'basic[weight]': { type: 'string' },
        'basic[gender]': { type: 'string' },
        'basic[size]': { type: 'string' },
        'basic[colors]': { type: 'string' },
        'basic[colorName]': { type: 'string' },
        'basic[description]': { type: 'string' },
        'basic[tagNumber]': { type: 'string' },
        'basic[stock]': { type: 'string' },
        'basic[tags]': { type: 'string' },
        'basic[slug]': { type: 'string' },
        'basic[status]': { type: 'string' },
        'basic[visibility]': { type: 'string' },
        'basic[publishedAt]': { type: 'string' },
        'basic[isSignaturePiece]': { type: 'boolean' },
        'basic[isFeatured]': { type: 'boolean' },
        'basic[signatureLabel]': { type: 'string' },
        'basic[signatureStory]': { type: 'string' },
        'basic[allowBackorder]': { type: 'boolean' },
        'basic[isPreorder]': { type: 'boolean' },
        'basic[minOrderQty]': { type: 'string' },
        'basic[maxOrderQty]': { type: 'string' },
        'basic[leadTimeDays]': { type: 'string' },
        'basic[hsCode]': { type: 'string' },
        'basic[warrantyInfo]': { type: 'string' },
        'basic[sizeGuideUrl]': { type: 'string' },
        'basic[badges]': { type: 'string' },
        // Removed rating, reviewsCount, views - these are now read-only in ProductMain
        'basic[sales]': { type: 'string' },
        'basic[quantity]': { type: 'string' },
        'basic[reviewUi]': { type: 'string' },
        'basic[soldUi]': { type: 'string' },
        // Pricing tab fields
        'pricing[price]': { type: 'string' },
        'pricing[priceUSD]': { type: 'string' },
        'pricing[currency]': { type: 'string' },
        'pricing[discount]': { type: 'string' },
        'pricing[discountType]': { type: 'string' },
        'pricing[compareAtPrice]': { type: 'string' },
        'pricing[saleStartAt]': { type: 'string' },
        'pricing[saleEndAt]': { type: 'string' },
        'pricing[discountLabel]': { type: 'string' },
        'pricing[tax]': { type: 'string' },
        // Media tab fields - images handled via file upload only
        // Multiple image uploads
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          }
        },
        // SEO tab fields
        'seo[seoTitle]': { type: 'string' },
        'seo[seoDescription]': { type: 'string' },
        'seo[canonicalUrl]': { type: 'string' },
        'seo[ogImage]': { type: 'string' },
        // Association tab fields - REMOVED (no longer needed)
        // Attributes & Tags tab fields
        'attributesTag[attributes]': { type: 'string' },
        'attributesTag[tags]': { type: 'string' },
        // Variants tab fields
        'variants[variants]': { type: 'string' },
        // Inventory tab fields
        'inventory[sku]': { type: 'string' },
        'inventory[barcode]': { type: 'string' },
        'inventory[inventoryQuantity]': { type: 'string' },
        'inventory[lowStockThreshold]': { type: 'string' },
        'inventory[reorderPoint]': { type: 'string' },
        'inventory[reorderQuantity]': { type: 'string' },
        'inventory[supplier]': { type: 'string' },
        'inventory[supplierSku]': { type: 'string' },
        'inventory[costPrice]': { type: 'string' },
        'inventory[margin]': { type: 'string' },
        'inventory[location]': { type: 'string' },
        'inventory[warehouse]': { type: 'string' },
        'inventory[binLocation]': { type: 'string' },
        'inventory[lastRestocked]': { type: 'string' },
        'inventory[nextRestockDate]': { type: 'string' },
        'inventory[inventoryStatus]': { type: 'string' },
        'inventory[trackInventory]': { type: 'boolean' },
        'inventory[reservedQuantity]': { type: 'string' },
        'inventory[availableQuantity]': { type: 'string' },
        // Reels tab fields
        'reels[platform]': { type: 'string' },
        'reels[reelTitle]': { type: 'string' },
        'reels[reelDescription]': { type: 'string' },
        'reels[reelLanguage]': { type: 'string' },
        'reels[captionsUrl]': { type: 'string' },
        'reels[thumbnailUrl]': { type: 'string' },
        'reels[durationSec]': { type: 'string' },
        'reels[aspectRatio]': { type: 'string' },
        'reels[ctaUrl]': { type: 'string' },
        'reels[reelTags]': { type: 'string' },
        'reels[isPublic]': { type: 'boolean' },
        'reels[isPinned]': { type: 'boolean' },
        'reels[reelOrder]': { type: 'string' },
        // Video file upload
        videoFile: {
          type: 'string',
          format: 'binary'
        },
        // Item Details tab fields
        'itemDetails[material]': { type: 'string' },
        'itemDetails[warranty]': { type: 'string' },
        'itemDetails[certification]': { type: 'string' },
        'itemDetails[vendorName]': { type: 'string' },
        'itemDetails[shippingFreeText]': { type: 'string' },
        'itemDetails[qualityGuaranteeText]': { type: 'string' },
        'itemDetails[careInstructionsText]': { type: 'string' },
        'itemDetails[didYouKnow]': { type: 'string' },
        'itemDetails[faqs]': { type: 'string' },
        'itemDetails[sellerBlurb]': { type: 'string' },
        'itemDetails[trustBadges]': { type: 'string' },
        // Shipping & Policies tab fields
        'shippingPolicies[shippingInfo]': { type: 'string' },
        'shippingPolicies[shippingNotes]': { type: 'string' },
        'shippingPolicies[packagingDetails]': { type: 'string' },
        'shippingPolicies[returnPolicy]': { type: 'string' },
        'shippingPolicies[returnWindowDays]': { type: 'string' },
        'shippingPolicies[returnFees]': { type: 'string' },
        'shippingPolicies[isReturnable]': { type: 'boolean' },
        'shippingPolicies[exchangePolicy]': { type: 'string' },
        'shippingPolicies[warrantyPeriodMonths]': { type: 'string' },
        'shippingPolicies[warrantyType]': { type: 'string' },
        'shippingPolicies[originCountry]': { type: 'string' },
        'shippingPolicies[weightKg]': { type: 'string' },
        'shippingPolicies[dimensions]': { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductFullResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  async createMain(@Req() request: FastifyRequest) {
    try {
      const parts = request.parts();
      const fields: any = {};
      const uploadedImages: string[] = [];
      let videoFile: Express.Multer.File | null = null;

      // Process multipart form data
      for await (const part of parts) {
        if ((part as any).file) {
          // Handle file uploads
          const file = {
            fieldname: part.fieldname,
            originalname: (part as any).filename,
            encoding: '7bit',
            mimetype: (part as any).mimetype,
            size: (part as any).file.bytesRead,
            buffer: await (part as any).toBuffer(),
            stream: (part as any).file,
            destination: '',
            filename: (part as any).filename,
            path: '',
          };

          if (part.fieldname === 'images') {
            // Handle multiple image uploads
            const imagePath = await this.fileUploadService.uploadProductImage(file);
            uploadedImages.push(imagePath);
          } else if (part.fieldname === 'videoFile') {
            // Handle video file upload
            videoFile = file;
            const videoPath = await this.fileUploadService.uploadProductVideo(file);
            fields['reels[videoFile]'] = videoPath;
          }
        } else {
          // Handle form fields
          const value = (part as any).value;
          
          // Parse boolean fields
          if (['basic[isSignaturePiece]', 'basic[isFeatured]', 'basic[allowBackorder]', 'basic[isPreorder]', 'inventory[trackInventory]', 'reels[isPublic]', 'reels[isPinned]', 'shippingPolicies[isReturnable]'].includes(part.fieldname)) {
            fields[part.fieldname] = value === 'true';
          } else {
            fields[part.fieldname] = value;
          }
        }
      }

      // Process uploaded images
      if (uploadedImages.length > 0) {
        fields['media[images]'] = JSON.stringify(uploadedImages);
      }

      // Convert flat fields to nested structure
      const productData = this.convertFlatToNested(fields);
      productData.createdBy = (request as any).user?.id || 'public-user'; // Default for public access

      return this.productsService.createMain(productData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  // Helper method to convert flat form fields to nested structure
  private convertFlatToNested(fields: any): any {
    const result: any = {
      name: fields.name,
      image: fields.image,
      shortDescription: fields.shortDescription,
    };

    // Process each tab (removed association)
    const tabs = ['basic', 'pricing', 'media', 'seo', 'attributesTag', 'variants', 'inventory', 'reels', 'itemDetails', 'shippingPolicies'];
    
    tabs.forEach(tab => {
      const tabData: any = {};
      Object.keys(fields).forEach(key => {
        if (key.startsWith(`${tab}[`) && key.endsWith(']')) {
          const fieldName = key.substring(tab.length + 1, key.length - 1);
          tabData[fieldName] = fields[key];
        }
      });
      
      if (Object.keys(tabData).length > 0) {
        result[tab] = tabData;
      }
    });

    return result;
  }

  // Legacy endpoint for backward compatibility
  @Post('legacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Create a new product (legacy endpoint)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        comparePrice: { type: 'number' },
        cost: { type: 'number' },
        sku: { type: 'string' },
        barcode: { type: 'string' },
        weight: { type: 'number' },
        dimensions: { type: 'string' },
        stockQuantity: { type: 'number' },
        minStockLevel: { type: 'number' },
        isActive: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        vendorId: { type: 'string' },
        categoryId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        attributes: { type: 'object' },
        images: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    schema: { $ref: '#/components/schemas/Product' },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  async create(@Req() request: FastifyRequest) {
    try {
      const parts = request.parts();
      const fields: any = {};
      let imageFile: Express.Multer.File | null = null;

      // Process multipart form data
      for await (const part of parts) {
        if ((part as any).file && part.fieldname === 'images') {
          // Handle image file
          imageFile = {
            fieldname: part.fieldname,
            originalname: (part as any).filename,
            encoding: '7bit',
            mimetype: (part as any).mimetype,
            size: (part as any).file.bytesRead,
            buffer: await (part as any).toBuffer(),
            stream: (part as any).file,
            destination: '',
            filename: (part as any).filename,
            path: '',
          };
        } else if (!(part as any).file) {
          // Handle form fields
          const value = (part as any).value;
          
          // Parse array fields as JSON strings
          if (['tags'].includes(part.fieldname)) {
            try {
              const parsed = JSON.parse(value);
              fields[part.fieldname] = Array.isArray(parsed) ? JSON.stringify(parsed) : value;
            } catch {
              fields[part.fieldname] = value ? JSON.stringify([value]) : JSON.stringify([]);
            }
          } else if (['isActive', 'isFeatured'].includes(part.fieldname)) {
            fields[part.fieldname] = value === 'true';
          } else if (['price', 'comparePrice', 'cost', 'weight', 'stockQuantity', 'minStockLevel'].includes(part.fieldname)) {
            fields[part.fieldname] = value ? parseFloat(value) : undefined;
          } else {
            fields[part.fieldname] = value;
          }
        }
      }

      // Handle image upload if provided
      let imagePath: string | undefined;
      if (imageFile) {
        imagePath = await this.fileUploadService.uploadProductImage(imageFile);
      }

      // Create product
      return this.productsService.create({
        ...fields,
        images: imagePath
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  @Patch(':id/child')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a specific child tab of a product' })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateChildDto })
  @ApiResponse({
    status: 200,
    description: 'Child tab updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid tab name or data',
  })
  async updateChild(@Param('id') id: string, @Body() updateChildDto: UpdateChildDto, @Req() req: FastifyRequest) {
    try {
      const userId = (req as any).user?.id;
      const updateData = {
        ...updateChildDto,
        updatedBy: userId,
      };
      
      return this.productsService.updateChild(id, updateData);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update child tab: ' + error.message);
    }
  }

  // Legacy endpoint for backward compatibility
  @Patch('legacy/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'product', productIdField: 'id' })
  @ApiOperation({ summary: 'Update a product (legacy endpoint)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        comparePrice: { type: 'number' },
        cost: { type: 'number' },
        sku: { type: 'string' },
        barcode: { type: 'string' },
        weight: { type: 'number' },
        dimensions: { type: 'string' },
        stockQuantity: { type: 'number' },
        minStockLevel: { type: 'number' },
        isActive: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        vendorId: { type: 'string' },
        categoryId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        attributes: { type: 'object' },
        images: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    schema: { $ref: '#/components/schemas/Product' },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async update(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      const parts = request.parts();
      const fields: any = {};
      let imageFile: Express.Multer.File | null = null;

      // Process multipart form data
      for await (const part of parts) {
        if ((part as any).file && part.fieldname === 'images') {
          // Handle image file
          imageFile = {
            fieldname: part.fieldname,
            originalname: (part as any).filename,
            encoding: '7bit',
            mimetype: (part as any).mimetype,
            size: (part as any).file.bytesRead,
            buffer: await (part as any).toBuffer(),
            stream: (part as any).file,
            destination: '',
            filename: (part as any).filename,
            path: '',
          };
        } else if (!(part as any).file) {
          // Handle form fields
          const value = (part as any).value;
          
          // Parse array fields as JSON strings
          if (['tags'].includes(part.fieldname)) {
            try {
              const parsed = JSON.parse(value);
              fields[part.fieldname] = Array.isArray(parsed) ? JSON.stringify(parsed) : value;
            } catch {
              fields[part.fieldname] = value ? JSON.stringify([value]) : JSON.stringify([]);
            }
          } else if (['isActive', 'isFeatured'].includes(part.fieldname)) {
            fields[part.fieldname] = value === 'true';
          } else if (['price', 'comparePrice', 'cost', 'weight', 'stockQuantity', 'minStockLevel'].includes(part.fieldname)) {
            fields[part.fieldname] = value ? parseFloat(value) : undefined;
          } else {
            fields[part.fieldname] = value;
          }
        }
      }

      // Handle image upload if provided
      let imagePath: string | undefined;
      if (imageFile) {
        imagePath = await this.fileUploadService.uploadProductImage(imageFile);
      }

      // Update product
      return this.productsService.update(id, {
        ...fields,
        images: imagePath
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product: ' + error.message);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'product', productIdField: 'id' })
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'product', productIdField: 'id' })
  @ApiOperation({ summary: 'Soft delete a product' })
  async softDelete(@Param('id') id: string, @Req() req: FastifyRequest) {
    const userId = (req as any).user?.id;
    await this.productsService.softDelete(id, userId);
    return { success: true };
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'product', productIdField: 'id' })
  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  async restore(@Param('id') id: string, @Req() req: FastifyRequest) {
    const userId = (req as any).user?.id;
    await this.productsService.restore(id, userId);
    return { success: true };
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'product', productIdField: 'id' })
  @ApiOperation({ summary: 'Toggle product active status' })
  async toggleStatus(@Param('id') id: string, @Req() req: FastifyRequest) {
    const userId = (req as any).user?.id;
    await this.productsService.toggleStatus(id, userId);
    return { success: true };
  }

  // Separate routes for read-only fields updates
  @Patch(':id/rating')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product rating' })
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'number', minimum: 0, maximum: 5 }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Rating updated successfully',
  })
  async updateRating(@Param('id') id: string, @Body() body: { rating: number }) {
    return this.productsService.updateRating(id, body.rating);
  }

  @Patch(':id/reviews-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product reviews count' })
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reviewsCount: { type: 'number', minimum: 0 }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews count updated successfully',
  })
  async updateReviewsCount(@Param('id') id: string, @Body() body: { reviewsCount: number }) {
    return this.productsService.updateReviewsCount(id, body.reviewsCount);
  }

  @Patch(':id/views')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product views count' })
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        views: { type: 'number', minimum: 0 }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Views count updated successfully',
  })
  async updateViews(@Param('id') id: string, @Body() body: { views: number }) {
    return this.productsService.updateViews(id, body.views);
  }

  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload image for a specific product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        imagePath: { type: 'string' },
        imageUrl: { type: 'string' }
      }
    }
  })
  async uploadImage(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      const parts = request.parts();
      let imageFile: Express.Multer.File | null = null;

      // Process multipart form data
      for await (const part of parts) {
        if ((part as any).file && part.fieldname === 'image') {
          // Handle image file
          imageFile = {
            fieldname: part.fieldname,
            originalname: (part as any).filename,
            encoding: '7bit',
            mimetype: (part as any).mimetype,
            size: (part as any).file.bytesRead,
            buffer: await (part as any).toBuffer(),
            stream: (part as any).file,
            destination: '',
            filename: (part as any).filename,
            path: '',
          };
        }
      }

      if (!imageFile) {
        throw new BadRequestException('No image file provided');
      }

      const imagePath = await this.fileUploadService.uploadProductImage(imageFile);
      
      // Update product with new image
      await this.productsService.update(id, { images: imagePath });

      return {
        message: 'Image uploaded successfully',
        imagePath,
        imageUrl: `${process.env.APP_URL || 'http://localhost:5000'}/${imagePath}`
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload image: ' + error.message);
    }
  }
}

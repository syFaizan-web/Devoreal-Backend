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
  Request,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpStatus,
  HttpException,
  Logger
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
import { CreateProductMainDto } from './dto/create-product-main.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, ProductFullResponseDto } from './dto/product-response.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateMainProductDto } from './dto/update-main-product.dto';
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
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all products for main screen (selective fields)' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllProducts() {
    try {
      this.logger.log('Fetching all products for main screen');
      const products = await this.productsService.getAllProducts();
      this.logger.log(`Successfully fetched ${products.length} products`);
      return products;
    } catch (error) {
      this.logger.error('Failed to fetch products for main screen', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch products: ' + error.message);
    }
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findAll(@Query() query: any) {
    try {
      this.logger.log('Fetching all products (legacy endpoint)', { query });
      const products = await this.productsService.findAll();
      this.logger.log(`Successfully fetched ${products.length} products (legacy)`);
      return products;
    } catch (error) {
      this.logger.error('Failed to fetch products (legacy endpoint)', error.stack, { query });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch products: ' + error.message);
    }
  }

  // ==================== FILTERING ENDPOINTS ====================

  @Get('filter')
  @Public()
  @ApiOperation({ 
    summary: 'Professional Product Filtering - All-in-One Endpoint',
    description: 'Comprehensive product filtering with support for search, category, collection, tags, price range, vendor, store, and more. This single endpoint replaces all individual filter endpoints.'
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for product name or description' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'collectionId', required: false, type: String, description: 'Filter by collection ID' })
  @ApiQuery({ name: 'vendorId', required: false, type: String, description: 'Filter by vendor ID' })
  @ApiQuery({ name: 'storeId', required: false, type: String, description: 'Filter by store ID' })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Filter by tags (comma-separated)' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by single tag' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'signaturePieces', required: false, type: Boolean, description: 'Filter signature pieces (true/false)' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean, description: 'Filter featured products (true/false)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter active products (true/false)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (createdAt, updatedAt, name, price, rating, views)' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc, desc)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Filtered products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        products: { 
          type: 'array', 
          items: { $ref: '#/components/schemas/ProductResponseDto' },
          description: 'Array of filtered products'
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Items per page' },
            totalCount: { type: 'number', description: 'Total number of products matching filters' },
            totalPages: { type: 'number', description: 'Total number of pages' },
            hasNextPage: { type: 'boolean', description: 'Whether there is a next page' },
            hasPrevPage: { type: 'boolean', description: 'Whether there is a previous page' }
          },
          description: 'Pagination information'
        },
        filters: {
          type: 'object',
          description: 'Applied filters summary',
          properties: {
            search: { type: 'string', description: 'Applied search term' },
            categoryId: { type: 'string', description: 'Applied category filter' },
            collectionId: { type: 'string', description: 'Applied collection filter' },
            tags: { type: 'string', description: 'Applied tags filter' },
            priceRange: { type: 'object', description: 'Applied price range' },
            signaturePieces: { type: 'boolean', description: 'Signature pieces filter' },
            featured: { type: 'boolean', description: 'Featured products filter' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters or filter values',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductsWithFilters(@Query() query: QueryProductDto, @Req() req: any) {
    try {
      // Debug: Log raw query parameters before any processing
      console.log('Controller - Raw query object:', JSON.stringify(query, null, 2));
      console.log('Controller - Raw URL query:', req.query);
      
      // Manual parameter parsing to fix boolean transformation issue
      const rawQuery = req.query;
      if (rawQuery.signaturePieces !== undefined) {
        if (rawQuery.signaturePieces === 'false' || rawQuery.signaturePieces === false) {
          query.signaturePieces = false;
        } else if (rawQuery.signaturePieces === 'true' || rawQuery.signaturePieces === true) {
          query.signaturePieces = true;
        }
      }
      
      if (rawQuery.featured !== undefined) {
        if (rawQuery.featured === 'false' || rawQuery.featured === false) {
          query.featured = false;
        } else if (rawQuery.featured === 'true' || rawQuery.featured === true) {
          query.featured = true;
        }
      }
      
      if (rawQuery.active !== undefined) {
        if (rawQuery.active === 'false' || rawQuery.active === false) {
          query.active = false;
        } else if (rawQuery.active === 'true' || rawQuery.active === true) {
          query.active = true;
        }
      }
      
      console.log('Controller - Fixed query object:', JSON.stringify(query, null, 2));
      
      this.logger.log('Fetching products with comprehensive filters', { 
        filters: query,
        timestamp: new Date().toISOString()
      });
      
      // Debug: Log raw query parameters before DTO transformation
      this.logger.log('Raw query parameters received', {
        signaturePieces: query.signaturePieces,
        featured: query.featured,
        active: query.active,
        signaturePiecesType: typeof query.signaturePieces,
        featuredType: typeof query.featured,
        activeType: typeof query.active
      });
      
      const result = await this.productsService.getProductsWithFilters(query);
      
      this.logger.log(`Successfully fetched ${result.products.length} filtered products`, {
        totalCount: result.pagination?.totalCount || 0,
        appliedFilters: {
          search: query.search,
          categoryId: query.categoryId,
          collectionId: query.collectionId,
          tags: query.tags,
          priceRange: query.minPrice || query.maxPrice ? `${query.minPrice || 0}-${query.maxPrice || '∞'}` : null,
          signaturePieces: query.signaturePieces,
          featured: query.featured
        }
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch filtered products', error.stack, { 
        query,
        timestamp: new Date().toISOString()
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch filtered products: ' + error.message);
    }
  }




  @Get('signature-pieces')
  @Public()
  @ApiOperation({ summary: 'Get signature pieces' })
  @ApiResponse({
    status: 200,
    description: 'Signature pieces retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getSignaturePieces(@Query() query: QueryProductDto) {
    try {
      this.logger.log('Fetching signature pieces');
      const result = await this.productsService.getSignaturePieces(query);
      this.logger.log(`Successfully fetched ${result.products.length} signature pieces`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch signature pieces', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch signature pieces: ' + error.message);
    }
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
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductFullDetail(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Fetching full product detail', { productId: id });
      const product = await this.productsService.getProductFullDetail(id);
      this.logger.log('Successfully fetched product detail', { productId: id, productName: product.name });
      return product;
    } catch (error) {
      this.logger.error('Failed to fetch product detail', error.stack, { productId: id });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch product detail: ' + error.message);
    }
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
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findOne(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Fetching product by ID (legacy endpoint)', { productId: id });
      const product = await this.productsService.findOne(id);
      this.logger.log('Successfully fetched product (legacy)', { productId: id, productName: product.name });
      return product;
    } catch (error) {
      this.logger.error('Failed to fetch product (legacy endpoint)', error.stack, { productId: id });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch product: ' + error.message);
    }
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
        shortDescription: { type: 'string' },
        price: { type: 'string' },
        image: { type: 'string' },
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
        // Media tab fields - multiple file uploads
        'media[images]': { type: 'string' },
        'media[videoFile]': { type: 'string' },
        // Multiple image uploads
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          }
        },
        // Main image upload
        mainImage: {
          type: 'string',
          format: 'binary'
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createMain(@Req() request: FastifyRequest) {
    try {
      this.logger.log('Creating new product with tab-wise structure');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = request.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      const fields: any = {};
      const uploadedImages: string[] = [];
      let videoFile: Express.Multer.File | null = null;
      let mainImageFile: Express.Multer.File | null = null;

      // Process form data from request.body
      for (const [key, value] of Object.entries(bodyFields)) {
        console.log(`🔍 Processing field: ${key}, type: ${typeof value}, value:`, value);
        
        if ((value as any)?.filename) {
          // This is a file upload
          console.log(`📷 Processing file: ${key}`);
          const file = {
            fieldname: (value as any).fieldname,
            originalname: (value as any).filename,
            encoding: (value as any).encoding,
            mimetype: (value as any).mimetype,
            size: (value as any).file?.bytesRead || (value as any)._buf?.length || 0,
            buffer: (value as any)._buf,
            stream: (value as any).file,
            destination: '',
            filename: (value as any).filename,
            path: '',
          } as Express.Multer.File;

          if (key === 'images') {
            // Handle multiple image uploads
            const imagePath = await this.fileUploadService.uploadProductImage(file);
            uploadedImages.push(imagePath);
            console.log(`📷 Uploaded image: ${imagePath}`);
          } else if (key === 'mainImage') {
            // Handle main image upload
            const mainImagePath = await this.fileUploadService.uploadProductImage(file);
            fields['image'] = mainImagePath;
            console.log(`📷 Uploaded main image: ${mainImagePath}`);
          } else if (key === 'image') {
            // Handle main image upload (alternative field name)
            const mainImagePath = await this.fileUploadService.uploadProductImage(file);
            fields['image'] = mainImagePath;
            console.log(`📷 Uploaded main image (image field): ${mainImagePath}`);
          } else if (key === 'videoFile') {
            // Handle video file upload
            videoFile = file;
            const videoPath = await this.fileUploadService.uploadProductVideo(file);
            fields['media[videoFile]'] = videoPath;
            console.log(`🎥 Uploaded video: ${videoPath}`);
          }
        } else {
          // This is a form field - handle different value structures
          let fieldValue;
          
          if ((value as any)?.value !== undefined) {
            // Value is wrapped in an object with 'value' property
            fieldValue = (value as any).value;
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            // Value is directly the field value
            fieldValue = value;
          } else {
            // Try to extract value from other possible structures
            fieldValue = value;
          }
          
          fields[key] = fieldValue;
          console.log(`📝 Form field added: ${key} = ${fieldValue}`);
        }
      }

      // Process uploaded images and media files
      if (uploadedImages.length > 0) {
        fields['media[images]'] = JSON.stringify(uploadedImages);
        console.log(`📷 Processed ${uploadedImages.length} images for media tab`);
      }

      // Ensure main image is set if not already set
      if (!fields['image'] && uploadedImages.length > 0) {
        fields['image'] = uploadedImages[0]; // Use first uploaded image as main image
        console.log(`📷 Set main image from uploaded images: ${uploadedImages[0]}`);
      } else if (fields['image']) {
        console.log(`📷 Main image already set: ${fields['image']}`);
      } else {
        console.log(`❌ No main image set`);
      }

      // Convert flat fields to nested structure
      const productData = this.convertFlatToNested(fields);
      productData.createdBy = (request as any).user?.id || 'public-user'; // Default for public access

      // Additional validation before calling service - name is still required
      if (!productData.name || productData.name.trim() === '') {
        throw new BadRequestException('Product name is required and cannot be empty');
      }

      console.log('Final product data being sent to service:', JSON.stringify(productData, null, 2));
      const result = await this.productsService.createMain(productData);
      
      this.logger.log('Product created successfully', { 
        productId: result.productMain.id, 
        productName: result.productMain.name 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create product', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create product: ' + error.message);
    }
  }

  // Helper method to convert flat form fields to nested structure
  private convertFlatToNested(fields: any): any {
    // Debug logging to see what fields we're receiving
    console.log('Processing fields:', JSON.stringify(fields, null, 2));
    
    const result: any = {
      name: fields.name || fields['basic[name]'] || '',
      shortDescription: fields.shortDescription || fields['basic[shortDescription]'] || '',
      price: fields.price ? parseFloat(fields.price) : undefined,
      image: fields.image || fields['basic[image]'] || '',
    };

    // Ensure name is not empty - name is still required for product creation
    if (!result.name || result.name.trim() === '') {
      throw new BadRequestException('Product name is required and cannot be empty');
    }

    // Process each tab (removed association)
    const tabs = ['basic', 'pricing', 'media', 'seo', 'attributesTag', 'variants', 'inventory', 'reels', 'itemDetails', 'shippingPolicies'];
    
    // Define field mappings for each tab
    const tabFieldMappings = {
      basic: ['categoryId', 'collectionId', 'signaturePieceId', 'brand', 'weight', 'gender', 'size', 'colors', 'colorName', 'description', 'tagNumber', 'stock', 'tags', 'slug', 'status', 'visibility', 'publishedAt', 'isSignaturePiece', 'isFeatured', 'signatureLabel', 'signatureStory', 'allowBackorder', 'isPreorder', 'minOrderQty', 'maxOrderQty', 'leadTimeDays', 'hsCode', 'warrantyInfo', 'badges', 'sales', 'quantity', 'reviewUi', 'soldUi'],
      pricing: ['price', 'priceUSD', 'currency', 'discount', 'discountType', 'compareAtPrice', 'saleStartAt', 'saleEndAt', 'discountLabel', 'tax'],
      media: ['images', 'videoFile'],
      seo: ['seoTitle', 'seoDescription', 'canonicalUrl', 'ogImage'],
      attributesTag: ['attributes', 'tags'],
      variants: ['variants'],
      inventory: ['sku', 'barcode', 'inventoryQuantity', 'lowStockThreshold', 'reorderPoint', 'reorderQuantity', 'supplier', 'supplierSku', 'costPrice', 'margin', 'location', 'warehouse', 'binLocation', 'lastRestocked', 'nextRestockDate', 'inventoryStatus', 'trackInventory', 'reservedQuantity', 'availableQuantity'],
      reels: ['platform', 'reelTitle', 'reelDescription', 'reelLanguage', 'captionsUrl', 'thumbnailUrl', 'durationSec', 'aspectRatio', 'ctaUrl', 'reelTags', 'isPublic', 'isPinned', 'reelOrder'],
      itemDetails: ['material', 'warranty', 'certification', 'vendorName', 'shippingFreeText', 'qualityGuaranteeText', 'careInstructionsText', 'didYouKnow', 'faqs', 'sellerBlurb', 'trustBadges'],
      shippingPolicies: ['shippingInfo', 'shippingNotes', 'packagingDetails', 'returnPolicy', 'returnWindowDays', 'returnFees', 'isReturnable', 'exchangePolicy', 'warrantyPeriodMonths', 'warrantyType', 'originCountry', 'weightKg', 'dimensions']
    };
    
    tabs.forEach(tab => {
      const tabData: any = {};
      const tabFields = tabFieldMappings[tab] || [];
      
      console.log(`\n🔍 Processing ${tab} tab...`);
      
      // First, check if there's a direct JSON string for this tab
      if (fields[tab] && typeof fields[tab] === 'string') {
        try {
          const parsedData = JSON.parse(fields[tab]);
          console.log(`  ✅ Found JSON string for ${tab} tab, parsing...`);
          
          // Convert data types based on field names
          Object.keys(parsedData).forEach(fieldName => {
            let value = parsedData[fieldName];
            
            // Convert data types based on field name
            if (['weight', 'price', 'priceUSD', 'discount', 'compareAtPrice', 'tax', 'costPrice', 'margin', 'returnFees', 'weightKg'].includes(fieldName)) {
              value = value ? parseFloat(value) : undefined;
            } else if (['stock', 'minOrderQty', 'maxOrderQty', 'leadTimeDays', 'sales', 'quantity', 'inventoryQuantity', 'lowStockThreshold', 'reorderPoint', 'reorderQuantity', 'reservedQuantity', 'availableQuantity', 'durationSec', 'reelOrder', 'returnWindowDays', 'warrantyPeriodMonths'].includes(fieldName)) {
              value = value ? parseInt(value) : undefined;
            } else if (['isSignaturePiece', 'isFeatured', 'allowBackorder', 'isPreorder', 'trackInventory', 'isPublic', 'isPinned', 'isReturnable'].includes(fieldName)) {
              value = value === 'true' || value === true;
            }
            
            tabData[fieldName] = value;
          });
          
          console.log(`  ✅ Parsed ${tab} tab with ${Object.keys(tabData).length} fields:`, Object.keys(tabData));
        } catch (error) {
          console.log(`  ❌ Failed to parse JSON for ${tab} tab:`, error.message);
        }
      }
      
      // Then, check for tab[field] pattern (e.g., basic[brand], pricing[price])
      console.log(`📋 Looking for fields matching pattern: ${tab}[field]`);
      Object.keys(fields).forEach(key => {
        if (key.startsWith(`${tab}[`) && key.endsWith(']')) {
          const fieldName = key.substring(tab.length + 1, key.length - 1);
          let value = fields[key];
          
          console.log(`  ✅ Found ${tab}[${fieldName}] = ${value}`);
          
          // Convert data types based on field name
          if (['weight', 'price', 'priceUSD', 'discount', 'compareAtPrice', 'tax', 'costPrice', 'margin', 'returnFees', 'weightKg'].includes(fieldName)) {
            value = value ? parseFloat(value) : undefined;
          } else if (['stock', 'minOrderQty', 'maxOrderQty', 'leadTimeDays', 'sales', 'quantity', 'inventoryQuantity', 'lowStockThreshold', 'reorderPoint', 'reorderQuantity', 'reservedQuantity', 'availableQuantity', 'durationSec', 'reelOrder', 'returnWindowDays', 'warrantyPeriodMonths'].includes(fieldName)) {
            value = value ? parseInt(value) : undefined;
          } else if (['isSignaturePiece', 'isFeatured', 'allowBackorder', 'isPreorder', 'trackInventory', 'isPublic', 'isPinned', 'isReturnable'].includes(fieldName)) {
            value = value === 'true' || value === true;
          }
          
          tabData[fieldName] = value;
        }
      });
      
      // Finally, check for direct field names that belong to this tab (fallback)
      console.log(`📋 Checking direct field names for ${tab} tab...`);
      tabFields.forEach(fieldName => {
        if (fields[fieldName] !== undefined && !tabData[fieldName]) {
          let value = fields[fieldName];
          console.log(`  ✅ Found direct field ${fieldName} = ${value}`);
          
          // Convert data types based on field name
          if (['weight', 'price', 'priceUSD', 'discount', 'compareAtPrice', 'tax', 'costPrice', 'margin', 'returnFees', 'weightKg'].includes(fieldName)) {
            value = value ? parseFloat(value) : undefined;
          } else if (['stock', 'minOrderQty', 'maxOrderQty', 'leadTimeDays', 'sales', 'quantity', 'inventoryQuantity', 'lowStockThreshold', 'reorderPoint', 'reorderQuantity', 'reservedQuantity', 'availableQuantity', 'durationSec', 'reelOrder', 'returnWindowDays', 'warrantyPeriodMonths'].includes(fieldName)) {
            value = value ? parseInt(value) : undefined;
          } else if (['isSignaturePiece', 'isFeatured', 'allowBackorder', 'isPreorder', 'trackInventory', 'isPublic', 'isPinned', 'isReturnable'].includes(fieldName)) {
            value = value === 'true' || value === true;
          }
          
          tabData[fieldName] = value;
        }
      });
      
      // Always create tab data if any fields are found, even if empty
      if (Object.keys(tabData).length > 0) {
        result[tab] = tabData;
        console.log(`✅ ${tab} tab created with ${Object.keys(tabData).length} fields:`, Object.keys(tabData));
      } else {
        console.log(`❌ ${tab} tab has no fields - skipping`);
      }
    });

    console.log('Converted result:', JSON.stringify(result, null, 2));
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(@Req() request: FastifyRequest) {
    try {
      this.logger.log('Creating new product (legacy endpoint)');
      
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
      const result = await this.productsService.create({
        ...fields,
        images: imagePath
      });

      this.logger.log('Product created successfully (legacy)', { 
        productId: result.id, 
        productName: result.name 
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create product (legacy endpoint)', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create product: ' + error.message);
    }
  }


  @Patch('tab/:tabId')
  @Public()
  @ApiOperation({ summary: 'Update specific tab fields using tab ID (Public Access)' })
  @ApiConsumes('application/json')
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        brand: { type: 'string' },
        categoryId: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        discount: { type: 'number' },
        currency: { type: 'string' },
        warranty: { type: 'string' },
        material: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        videoFile: { type: 'string' },
        seoTitle: { type: 'string' },
        seoDescription: { type: 'string' }
      }
    },
    description: 'Update data for specific tab using tab ID',
    examples: {
      'basicTab': {
        summary: 'Update basic tab fields',
        value: {
          brand: 'Hurijewels',
          categoryId: 'cat-123',
          description: 'Luxury jewelry'
        }
      },
      'pricingTab': {
        summary: 'Update pricing tab fields',
        value: {
          price: 1500,
          discount: 10,
          currency: 'USD'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Tab updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tab not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid tab data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateTabById(@Param('tabId') tabId: string, @Body() updateData: any, @Req() req: FastifyRequest) {
    try {
      if (!tabId || tabId.trim() === '') {
        throw new BadRequestException('Tab ID is required');
      }

      this.logger.log('Updating tab by ID', { tabId });
      
      const userId = (req as any).user?.id || 'public-user';
      
      const result = await this.productsService.updateTabById(tabId, updateData, userId);
      
      this.logger.log('Tab updated successfully by ID', { 
        tabId,
        updatedFields: Object.keys(updateData)
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to update tab by ID', error.stack, { tabId });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update tab: ' + error.message);
    }
  }

  @Patch('main/:id')
  @Public()
  @ApiOperation({ summary: 'Update main product fields using product ID (Public Access)' })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateMainProductDto })
  @ApiResponse({
    status: 200,
    description: 'Main product updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateMainProduct(@Param('id') id: string, @Body() updateData: UpdateMainProductDto, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Updating main product', { productId: id });
      
      const userId = (req as any).user?.id || 'public-user';
      
      const result = await this.productsService.updateMainProductWithPriceSync(id, updateData, userId);
      
      this.logger.log('Main product updated successfully', { 
        productId: id,
        updatedFields: Object.keys(updateData)
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to update main product', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update main product: ' + error.message);
    }
  }

  // Legacy endpoint for backward compatibility
  @Patch('legacy/:id')
  @Public()
  @ApiOperation({ summary: 'Update a product (legacy endpoint) - Public Access' })
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
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Updating product (legacy endpoint)', { productId: id });
      
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
      const result = await this.productsService.update(id, {
        ...fields,
        images: imagePath
      });

      this.logger.log('Product updated successfully (legacy)', { 
        productId: id, 
        productName: result.name 
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to update product (legacy endpoint)', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update product: ' + error.message);
    }
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: 'Hard delete a product permanently - Public Access' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product permanently deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Hard deleting product', { productId: id });
      const userId = (req as any).user?.id || 'public-user';
      const result = await this.productsService.hardDelete(id, userId);
      
      this.logger.log('Product hard deleted successfully', { productId: id });
      return result;
    } catch (error) {
      this.logger.error('Failed to hard delete product', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to hard delete product: ' + error.message);
    }
  }

  @Patch(':id/delete')
  @Public()
  @ApiOperation({ summary: 'Soft delete a product - Public Access' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product soft deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async softDelete(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Soft deleting product', { productId: id });
      const userId = (req as any).user?.id || 'public-user';
      await this.productsService.softDelete(id, userId);
      
      this.logger.log('Product soft deleted successfully', { productId: id });
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to soft delete product', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to soft delete product: ' + error.message);
    }
  }

  @Patch(':id/restore')
  @Public()
  @ApiOperation({ summary: 'Restore a soft-deleted product - Public Access' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product restored successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async restore(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Restoring product', { productId: id });
      const userId = (req as any).user?.id || 'public-user';
      await this.productsService.restore(id, userId);
      
      this.logger.log('Product restored successfully', { productId: id });
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to restore product', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to restore product: ' + error.message);
    }
  }

  @Patch(':id/toggle-status')
  @Public()
  @ApiOperation({ summary: 'Toggle product active status - Public Access' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product status toggled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async toggleStatus(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Toggling product status', { productId: id });
      const userId = (req as any).user?.id || 'public-user';
      await this.productsService.toggleStatus(id, userId);
      
      this.logger.log('Product status toggled successfully', { productId: id });
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to toggle product status', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to toggle product status: ' + error.message);
    }
  }

  // Separate routes for read-only fields updates
  @Patch(':id/rating')
  @Public()
  @ApiOperation({ summary: 'Update product rating - Public Access' })
  @ApiConsumes('application/json')
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
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
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID or rating value',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateRating(@Param('id') id: string, @Body() body: { rating: number }) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      if (body.rating === undefined || body.rating === null) {
        throw new BadRequestException('Rating value is required');
      }

      if (body.rating < 0 || body.rating > 5) {
        throw new BadRequestException('Rating must be between 0 and 5');
      }

      this.logger.log('Updating product rating', { productId: id, rating: body.rating });
      const result = await this.productsService.updateRating(id, body.rating);
      
      this.logger.log('Product rating updated successfully', { productId: id, rating: body.rating });
      return result;
    } catch (error) {
      this.logger.error('Failed to update product rating', error.stack, { productId: id, rating: body.rating });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update product rating: ' + error.message);
    }
  }

  @Get(':id/reviews-count')
  @Public()
  @ApiOperation({ summary: 'Get and update product reviews count - Public Access', description: 'Gets the product and updates the reviews count from actual reviews in the database' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved with updated reviews count',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        reviewsCount: { type: 'number' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getReviewsCount(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Getting and updating product reviews count', { productId: id });
      const result = await this.productsService.updateReviewsCount(id);
      
      this.logger.log('Product reviews count retrieved and updated successfully', { productId: id, reviewsCount: result.reviewsCount });
      return result;
    } catch (error) {
      this.logger.error('Failed to get product reviews count', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get product reviews count: ' + error.message);
    }
  }

  @Post(':id/views')
  @Public()
  @ApiOperation({ summary: 'Increment product views count - Public Access', description: 'Increments the product views count by 1' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Views count incremented successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        views: { type: 'number' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async incrementViews(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Incrementing product views count', { productId: id });
      const result = await this.productsService.incrementViews(id);
      
      this.logger.log('Product views count incremented successfully', { productId: id, newViews: result.views });
      return result;
    } catch (error) {
      this.logger.error('Failed to increment product views count', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to increment product views count: ' + error.message);
    }
  }

  @Get(':id/reviews')
  @Public()
  @ApiOperation({ summary: 'Get all reviews for a product - Public Access', description: 'Retrieves all active reviews for a specific product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          productId: { type: 'string' },
          rating: { type: 'number' },
          title: { type: 'string' },
          comment: { type: 'string' },
          isVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fullName: { type: 'string' },
              avatar: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid product ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductReviews(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      this.logger.log('Fetching reviews for product', { productId: id });
      const reviews = await this.productsService.getProductReviews(id);
      
      this.logger.log('Reviews fetched successfully', { productId: id, count: reviews.length });
      return reviews;
    } catch (error) {
      this.logger.error('Failed to fetch reviews', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch reviews: ' + error.message);
    }
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a review for a product - Authenticated Access', description: 'Creates a new review for a product. User must be authenticated.' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['rating'],
      properties: {
        rating: { type: 'integer', minimum: 1, maximum: 5, description: 'Rating from 1 to 5' },
        title: { type: 'string', description: 'Review title (optional)' },
        comment: { type: 'string', description: 'Review comment (optional)' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        productId: { type: 'string' },
        rating: { type: 'number' },
        title: { type: 'string' },
        comment: { type: 'string' },
        isVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            avatar: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User has already reviewed this product',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createReview(
    @Param('id') id: string,
    @Body() body: { rating: number; title?: string; comment?: string },
    @Request() req: any
  ) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Product ID is required');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      if (!body.rating || body.rating < 1 || body.rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      this.logger.log('Creating review', { productId: id, userId, rating: body.rating });
      const review = await this.productsService.createReview(
        id,
        userId,
        body.rating,
        body.title,
        body.comment
      );
      
      this.logger.log('Review created successfully', { reviewId: review.id, productId: id, userId });
      return review;
    } catch (error) {
      this.logger.error('Failed to create review', error.stack, { productId: id });
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create review: ' + error.message);
    }
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

  @Post('migrate/category-assignments')
  @Public()
  @ApiOperation({ summary: 'Migrate existing products to ensure proper category assignments' })
  @ApiResponse({
    status: 200,
    description: 'Migration completed successfully',
  })
  async migrateCategoryAssignments() {
    try {
      this.logger.log('Starting category assignment migration');
      const result = await this.productsService.migrateProductCategoryAssignments();
      this.logger.log('Category assignment migration completed', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to migrate category assignments', error.stack);
      throw new InternalServerErrorException('Failed to migrate category assignments: ' + error.message);
    }
  }
}

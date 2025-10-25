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
import { SearchProductDto } from './dto/search-product.dto';
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
  @ApiOperation({ summary: 'Get products with advanced filtering options' })
  @ApiResponse({
    status: 200,
    description: 'Filtered products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        products: { type: 'array', items: { $ref: '#/components/schemas/ProductResponseDto' } },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            totalCount: { type: 'number' },
            totalPages: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductsWithFilters(@Query() query: QueryProductDto) {
    try {
      this.logger.log('Fetching products with filters', { query });
      const result = await this.productsService.getProductsWithFilters(query);
      this.logger.log(`Successfully fetched ${result.products.length} filtered products`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch filtered products', error.stack, { query });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch filtered products: ' + error.message);
    }
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search products by name or description' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Search term required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async searchProducts(@Query() query: SearchProductDto) {
    try {
      if (!query.q || query.q.trim() === '') {
        throw new BadRequestException('Search term is required');
      }

      this.logger.log('Searching products', { searchTerm: query.q });
      const result = await this.productsService.searchProducts(query.q, query);
      this.logger.log(`Search completed: ${result.products.length} results found`);
      return result;
    } catch (error) {
      this.logger.error('Failed to search products', error.stack, { searchTerm: query.q });
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to search products: ' + error.message);
    }
  }

  @Get('category/:categoryId')
  @Public()
  @ApiOperation({ summary: 'Get products by category' })
  @ApiParam({ name: 'categoryId', required: true, type: String, description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Products by category retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductsByCategory(@Param('categoryId') categoryId: string, @Query() query: QueryProductDto) {
    try {
      if (!categoryId || categoryId.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }

      this.logger.log('Fetching products by category', { categoryId });
      const result = await this.productsService.getProductsByCategory(categoryId, query);
      this.logger.log(`Successfully fetched ${result.products.length} products for category ${categoryId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch products by category', error.stack, { categoryId });
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch products by category: ' + error.message);
    }
  }

  @Get('collection/:collectionId')
  @Public()
  @ApiOperation({ summary: 'Get products by collection' })
  @ApiParam({ name: 'collectionId', required: true, type: String, description: 'Collection ID' })
  @ApiResponse({
    status: 200,
    description: 'Products by collection retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid collection ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductsByCollection(@Param('collectionId') collectionId: string, @Query() query: QueryProductDto) {
    try {
      if (!collectionId || collectionId.trim() === '') {
        throw new BadRequestException('Collection ID is required');
      }

      this.logger.log('Fetching products by collection', { collectionId });
      const result = await this.productsService.getProductsByCollection(collectionId, query);
      this.logger.log(`Successfully fetched ${result.products.length} products for collection ${collectionId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch products by collection', error.stack, { collectionId });
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch products by collection: ' + error.message);
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

  @Get('tags/:tags')
  @Public()
  @ApiOperation({ summary: 'Get products by tags' })
  @ApiParam({ name: 'tags', required: true, type: String, description: 'Comma-separated tags' })
  @ApiResponse({
    status: 200,
    description: 'Products by tags retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid tags',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductsByTags(@Param('tags') tags: string, @Query() query: QueryProductDto) {
    try {
      if (!tags || tags.trim() === '') {
        throw new BadRequestException('Tags are required');
      }

      this.logger.log('Fetching products by tags', { tags });
      const result = await this.productsService.getProductsByTags(tags, query);
      this.logger.log(`Successfully fetched ${result.products.length} products for tags: ${tags}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch products by tags', error.stack, { tags });
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch products by tags: ' + error.message);
    }
  }

  @Get('price-range/:minPrice/:maxPrice')
  @Public()
  @ApiOperation({ summary: 'Get products by price range' })
  @ApiParam({ name: 'minPrice', required: true, type: Number, description: 'Minimum price' })
  @ApiParam({ name: 'maxPrice', required: true, type: Number, description: 'Maximum price' })
  @ApiResponse({
    status: 200,
    description: 'Products by price range retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid price range',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getProductsByPriceRange(
    @Param('minPrice') minPrice: string, 
    @Param('maxPrice') maxPrice: string, 
    @Query() query: QueryProductDto
  ) {
    try {
      const minPriceNum = parseFloat(minPrice);
      const maxPriceNum = parseFloat(maxPrice);

      if (isNaN(minPriceNum) || isNaN(maxPriceNum)) {
        throw new BadRequestException('Invalid price values');
      }

      if (minPriceNum < 0 || maxPriceNum < 0) {
        throw new BadRequestException('Price values must be non-negative');
      }

      if (minPriceNum > maxPriceNum) {
        throw new BadRequestException('Minimum price cannot be greater than maximum price');
      }

      this.logger.log('Fetching products by price range', { minPrice: minPriceNum, maxPrice: maxPriceNum });
      const result = await this.productsService.getProductsByPriceRange(minPriceNum, maxPriceNum, query);
      this.logger.log(`Successfully fetched ${result.products.length} products in price range ${minPriceNum}-${maxPriceNum}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch products by price range', error.stack, { minPrice, maxPrice });
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch products by price range: ' + error.message);
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

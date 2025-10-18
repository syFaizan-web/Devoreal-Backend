import { Body, Controller, Delete, ForbiddenException, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role as AuthRole } from '../../common/enums/role.enum';

@ApiTags('Collections')
@ApiBearerAuth('JWT-auth')
@Controller('collections')
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create collection (ADMIN, SUPER_ADMIN) with optional image upload' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or payload' })
  @ApiResponse({ status: 409, description: 'Conflict - slug already exists' })
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Bridal Collection' },
        slug: { type: 'string', example: 'bridal-collection' },
        description: { type: 'string', example: 'Handpicked bridal designs' },
        isActive: { type: 'boolean', example: true },
        image: { type: 'string', format: 'binary', description: 'Image file (JPEG, PNG, GIF, WebP)' },
      },
      required: ['title','slug'],
    },
  })
  async create(@Req() request: FastifyRequest) {
    try {
      console.log('📝 Processing collection creation request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = request.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Extract image file from bodyFields (since attachFieldsToBody: true puts files there too)
      let imageFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        console.log(`🔍 Processing field: ${key}, type: ${(value as any)?.type}`);
        if (key === 'image' && (value as any)?.filename) {
          // This is the image file
          console.log('📷 Processing image file...');
          imageFile = {
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
          console.log(`📷 Image file processed: ${(value as any).filename}`);
        } else if ((value as any)?.value !== undefined) {
          // This is a form field
          formData[key] = (value as any).value;
          console.log(`📝 Form field added: ${key} = ${(value as any).value}`);
        }
      }
      
      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);

      // Handle image upload if provided
      let imagePath: string | undefined;
      if (imageFile) {
        imagePath = await this.fileUploadService.uploadFile(imageFile, 'collections');
        formData.image = imagePath; // Store relative path
      }

      // Handle boolean conversion
      if (formData.isActive !== undefined) {
        formData.isActive = formData.isActive === 'true' || formData.isActive === true;
      }

      // Remove imageFile field from formData as we want to store the path
      delete formData.imageFile;

      // Extract user ID from request
      const userId = (request as any).user?.id;

      // Basic required field checks
      if (!formData.title || !formData.slug) {
        throw new BadRequestException('title and slug are required');
      }

      // Create collection DTO with proper validation
      const createCollectionDto: CreateCollectionDto = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        image: formData.image,
        isActive: formData.isActive ?? true,
      };
      
      console.log('📝 Creating DTO with:', createCollectionDto);

      // Create collection
      return await this.collectionsService.create(createCollectionDto, userId);
    } catch (error) {
      // Let known HTTP exceptions bubble, otherwise wrap
      if (error.getStatus) throw error;
      throw new BadRequestException('Failed to create collection: ' + error.message);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update collection (ADMIN, SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Collection title (optional)' },
        slug: { type: 'string', description: 'URL-friendly slug (optional)' },
        description: { type: 'string', description: 'Collection description (optional)' },
        isActive: { type: 'boolean', description: 'Collection status (optional)' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Collection image file (optional)'
        }
      }
    }
  })
  async update(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      console.log('📝 Processing collection update request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = request.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Extract image file from bodyFields (since attachFieldsToBody: true puts files there too)
      let imageFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        console.log(`🔍 Processing field: ${key}, type: ${(value as any)?.type}`);
        if (key === 'image' && (value as any)?.filename) {
          // This is the image file
          console.log('📷 Processing image file...');
          imageFile = {
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
          console.log(`📷 Image file processed: ${(value as any).filename}`);
        } else if ((value as any)?.value !== undefined) {
          // This is a form field
          formData[key] = (value as any).value;
          console.log(`📝 Form field added: ${key} = ${(value as any).value}`);
        }
      }
      
      console.log('📝 Extracted form data:', formData);

      if (imageFile) {
        // Store under uploads/collections
        const relative = await this.fileUploadService.uploadFile(imageFile, 'collections');
        formData.image = relative;
      }

      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');

      // Extract user ID from request
      const userId = (request as any).user?.id;

      // Update collection
      console.log('✅ Updating collection with:', formData);
      return this.collectionsService.update(id, formData, userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update collection: ' + error.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete collection (ADMIN, SUPER_ADMIN)' })
  @ApiResponse({ status: 204, description: 'Soft deleted' })
  async softDelete(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    await this.collectionsService.softDelete(id, userId);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hard delete collection (SUPER_ADMIN)' })
  @ApiResponse({ status: 204, description: 'Hard deleted' })
  async hardDelete(@Param('id') id: string, @Req() req: any) {
    // RolesGuard already restricts, double-check if needed
    await this.collectionsService.hardDelete(id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all collections (PUBLIC)', 
    description: '🌐 PUBLIC - Get all collections with optional filtering and pagination' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Collections retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cmg6q1gbb0000lys8ked39j1k' },
              title: { type: 'string', example: 'Bridal Collection' },
              slug: { type: 'string', example: 'bridal-collection' },
              description: { type: 'string', example: 'Handpicked bridal designs' },
              image: { type: 'string', example: 'uploads/collections/image.webp' },
              imageUrl: { type: 'string', example: 'http://localhost:5000/uploads/collections/image.webp' },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 25 },
            totalPages: { type: 'number', example: 3 }
          }
        }
      }
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in title and description' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['title', 'createdAt', 'updatedAt'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  async findAll(@Query() query: any) {
    return this.collectionsService.findAll(query);
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'List products by collection slug (PUBLIC)' })
  @ApiResponse({ status: 200, description: 'Products list returned' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['price_asc','price_desc','newest','name_asc','name_desc'] })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'inStock', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listProducts(
    @Param('slug') slug: string,
    @Query() query: ProductFilterDto,
  ) {
    return this.collectionsService.listProductsBySlug(slug, query);
  }
}



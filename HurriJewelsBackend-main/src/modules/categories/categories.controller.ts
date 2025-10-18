import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Req,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { CategoriesService } from './categories.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssetsService } from '../../common/services/assets.service';
import { Role as AuthRole } from '../../common/enums/role.enum';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly fileUploadService: FileUploadService,
    private readonly assetsService: AssetsService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create a new category (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Create a new category with optional image upload.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Category name (required)' },
        slug: { type: 'string', description: 'URL-friendly slug (optional, auto-generated if not provided)' },
        description: { type: 'string', description: 'Category description (optional)' },
        isActive: { type: 'boolean', description: 'Category status (optional, defaults to true)' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Category image file (optional)'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    schema: { $ref: '#/components/schemas/Category' },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category with this name already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create category',
  })
  async create(@Req() request: FastifyRequest) {
    try {
      console.log('📝 Processing category creation request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = request.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Extract image file from bodyFields (since attachFieldsToBody: true puts files there too)
      let imageFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        const v: any = value as any;
        const looksLikeFile = key === 'image' && (v?.filename || v?.file || v?._buf);
        if (looksLikeFile) {
          imageFile = {
            fieldname: v.fieldname || key,
            originalname: v.filename,
            encoding: v.encoding,
            mimetype: v.mimetype,
            size: v.file?.bytesRead || v._buf?.length || 0,
            buffer: v._buf,
            stream: v.file,
            destination: '',
            filename: v.filename,
            path: '',
          } as Express.Multer.File;
        } else if (v && 'value' in v) {
          formData[key] = v.value;
        } else if (typeof v === 'string') {
          formData[key] = v;
        }
      }
      
      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);

      // Handle image upload if provided
      let imagePath: string | undefined;
      if (imageFile) {
        imagePath = await this.fileUploadService.uploadCategoryImage(imageFile);
      }

      // Extract user ID from request
      const userId = (request as any).user?.id;

      // Create category DTO with proper validation
      const createCategoryDto: CreateCategoryDto = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        image: imagePath,
        isActive: formData.isActive === 'true' || formData.isActive === true || true,
      };
      
      console.log('📝 Creating DTO with:', createCategoryDto);

      // Create category
      return this.categoriesService.create(createCategoryDto, userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create category: ' + error.message);
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: '🌐 **PUBLIC ACCESS** - Get all categories. No authentication required.'
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Category' },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch categories',
  })
  async findAll() {
    try {
      return await this.categoriesService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch categories: ' + error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: '🌐 **PUBLIC ACCESS** - Get category by ID. No authentication required.'
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    schema: { $ref: '#/components/schemas/Category' },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch category',
  })
  async findOne(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }
      return await this.categoriesService.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch category: ' + error.message);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update a category (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Update a category with optional image upload.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Category name (required)' },
        slug: { type: 'string', description: 'URL-friendly slug (optional, auto-generated if not provided)' },
        description: { type: 'string', description: 'Category description (optional)' },
        isActive: { type: 'boolean', description: 'Category status (optional, defaults to true)' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Category image file (optional)'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    schema: { $ref: '#/components/schemas/Category' },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or category ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to update category',
  })
  async update(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      console.log('📝 Processing category update request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = request.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Extract image file from bodyFields (since attachFieldsToBody: true puts files there too)
      let imageFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        if (key === 'image' && (value as any)?.type === 'file') {
          // This is the image file
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
        } else if ((value as any)?.type === 'field') {
          // This is a form field
          formData[key] = (value as any).value;
        }
      }
      
      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);

      // Handle image upload if provided
      let imagePath: string | undefined;
      if (imageFile) {
        imagePath = await this.fileUploadService.uploadCategoryImage(imageFile);
      }

      // Update category
      return this.categoriesService.update(id, {
        ...formData,
        image: imagePath
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update category: ' + error.message);
    }
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Hard delete a category (Authorized: SUPER_ADMIN)',
    description: '🔒 Requires SUPER_ADMIN. Permanently delete a category.'
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: String })
  @ApiResponse({
    status: 204,
    description: 'Category permanently deleted',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to hard delete category',
  })
  async hardDelete(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }
      await this.categoriesService.hardDelete(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to hard delete category: ' + error.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Soft delete a category (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Soft delete a category.'
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Category soft deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID or category already deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to soft delete category',
  })
  async softDelete(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedException('User ID not found in request');
      }
      await this.categoriesService.softDelete(id, userId);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to soft delete category: ' + error.message);
    }
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Restore a soft-deleted category (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Restore a soft-deleted category.'
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Category restored successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID or category not deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to restore category',
  })
  async restore(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedException('User ID not found in request');
      }
      await this.categoriesService.restore(id, userId);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to restore category: ' + error.message);
    }
  }

  @Patch(':id/toggle-status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Toggle category active status (Authorized: ADMIN)',
    description: '🔒 Requires ADMIN. Toggle category active status.'
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Category status toggled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to toggle category status',
  })
  async toggleStatus(@Param('id') id: string, @Req() req: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Category ID is required');
      }
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedException('User ID not found in request');
      }
      await this.categoriesService.toggleStatus(id, userId);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to toggle category status: ' + error.message);
    }
  }

  @Post(':id/upload-image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Upload image for a specific category (Authorized: ADMIN)',
    description: '🔒 Requires ADMIN. Upload image for a specific category.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Category image file (optional)'
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
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid category ID or no image file provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to upload image',
  })
  async uploadImage(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      console.log('📝 Processing image upload for category...');
      
      // Extract image file from request.body (since attachFieldsToBody: true)
      const bodyFields = request.body as any || {};
      let imageFile = null;
      
      for (const [key, value] of Object.entries(bodyFields)) {
        if (key === 'image' && (value as any)?.type === 'file') {
          // This is the image file
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
        }
      }
      
      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');

      if (!imageFile) {
        throw new BadRequestException('No image file provided');
      }

      const imagePath = await this.fileUploadService.uploadCategoryImage(imageFile);
      
      // Update category with new image
      await this.categoriesService.update(id, { image: imagePath });

      return {
        message: 'Image uploaded successfully',
        imagePath,
        imageUrl: this.assetsService.buildUrl(imagePath)
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload image: ' + error.message);
    }
  }
}

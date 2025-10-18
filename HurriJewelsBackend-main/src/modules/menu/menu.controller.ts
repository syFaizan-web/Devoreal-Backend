import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { QueryMenuItemDto } from './dto/query-menu-item.dto';
import { MenuItemResponseDto, MenuItemTreeResponseDto } from './dto/menu-item-response.dto';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role as AuthRole } from '../../common/enums/role.enum';
import { MenuItemType } from './enums/menu-item-type.enum';
import { Role } from './types/role.enum';

@ApiTags('menu')
@Controller('menu-items')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create a new menu item (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Create a new menu item with optional image upload.'
  })
  @ApiQuery({ name: 'access_token', required: false, type: String, description: 'JWT access token (fallback if Swagger does not attach header)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Dashboard' },
        slug: { type: 'string', example: 'dashboard' },
        description: { type: 'string', example: 'Main dashboard page' },
        type: { type: 'string', example: 'page', enum: Object.values(MenuItemType) },
        targetType: { type: 'string', example: 'category', description: "What this item links to: 'category', 'collection', 'collections', 'Collection', 'signature', 'signature-pieces', 'Signature Pieces'" },
        categoryId: { type: 'string', example: 'uuid-of-category', description: 'ID of the linked entity (category/collection/signature piece) - will be shown in response categoryId field regardless of targetType' },
        collectionId: { type: 'string', example: 'uuid-of-collection', description: 'Required when targetType is collection/collections/Collection' },
        signaturePieceId: { type: 'string', example: 'uuid-of-signature-piece', description: 'Required when targetType is signature/signature-pieces/Signature Pieces' },
        parentId: { type: 'string', example: 'parent-menu-id' },
        level: { type: 'number', example: 0 },
        country: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['US', 'CA']
        },
        language: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['en', 'es']
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['navigation', 'main']
        },
        isActive: { type: 'boolean', example: true },
        order: { type: 'number', example: 0 },
        icon: { type: 'string', example: 'dashboard-icon' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP) - Optional',
        },
      },
      required: ['name', 'slug', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Menu item created successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error, slug already exists, or invalid file',
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
    description: 'Not found - Parent menu item or category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Slug already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create menu item',
  })
  async create(@Req() request: FastifyRequest): Promise<MenuItemResponseDto> {
    try {
      console.log('📝 Processing menu item creation request...');
      
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
          const fieldValue = (value as any).value;
          
          // Parse array fields
          if (['roles', 'country', 'language', 'tags'].includes(key)) {
            try {
              formData[key] = JSON.parse(fieldValue);
            } catch {
              formData[key] = fieldValue ? [fieldValue] : [];
            }
          } else if (['isActive'].includes(key)) {
            formData[key] = fieldValue === 'true';
          } else if (['level', 'order'].includes(key)) {
            formData[key] = fieldValue ? parseInt(fieldValue) : undefined;
          } else {
            formData[key] = fieldValue;
          }
          console.log(`📝 Form field added: ${key} = ${fieldValue}`);
        }
      }
      
      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);

      // Handle image upload if provided
      if (imageFile) {
        const imagePath = await this.fileUploadService.uploadFile(imageFile, 'menu-items');
        formData.image = imagePath;
      }

      // Get user ID from request
      const userId = (request as any).user?.id || 'system';
      formData.createdBy = userId;

      console.log('✅ Creating menu item with:', formData);

      // Create menu item
      return this.menuService.create(formData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create menu item: ' + error.message);
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all menu items (Authorized: PUBLIC)',
    description: '🌐 PUBLIC - Get all menu items with optional filtering.'
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'language', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of menu items retrieved successfully',
    type: [MenuItemResponseDto],
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch menu items',
  })
  async findAll(@Query() query: any): Promise<MenuItemResponseDto[]> {
    try {
      return await this.menuService.findAll(query);
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch menu items: ' + error.message);
    }
  }

  @Get('debug')
  @ApiOperation({ summary: 'Debug endpoint to test filtering' })
  async debugQuery(@Query() query: any): Promise<any> {
    // This debug endpoint can be removed in production
    return {
      message: 'Debug endpoint - Use proper logging instead of console.log',
      query,
      note: 'This endpoint should be removed in production'
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a single menu item by ID (Authorized: PUBLIC)',
    description: '🌐 PUBLIC - Get a single menu item by ID.'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item retrieved successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch menu item',
  })
  async findOne(@Param('id') id: string): Promise<MenuItemResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      return await this.menuService.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch menu item: ' + error.message);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update a menu item (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Update a menu item with optional image upload.'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Dashboard' },
        slug: { type: 'string', example: 'updated-dashboard' },
        description: { type: 'string', example: 'Updated dashboard page' },
        type: { type: 'string', example: 'page', enum: Object.values(MenuItemType) },
        targetType: { type: 'string', example: 'category', description: "What this item links to (e.g., 'category')" },
        categoryId: { type: 'string', example: 'uuid-of-category', description: 'Required when targetType is category' },
        parentId: { type: 'string', example: 'parent-menu-id' },
        level: { type: 'number', example: 0 },
        country: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['US', 'CA']
        },
        language: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['en', 'es']
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['navigation', 'main']
        },
        isActive: { type: 'boolean', example: true },
        order: { type: 'number', example: 0 },
        icon: { type: 'string', example: 'dashboard-icon' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP) - Optional',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Menu item updated successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error, slug already exists, or invalid file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async update(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<MenuItemResponseDto> {
    try {
      console.log('📝 Processing menu item update request...');
      
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
          const fieldValue = (value as any).value;
          
          // Parse array fields
          if (['roles', 'country', 'language', 'tags'].includes(key)) {
            try {
              formData[key] = JSON.parse(fieldValue);
            } catch {
              formData[key] = fieldValue ? [fieldValue] : [];
            }
          } else if (['isActive'].includes(key)) {
            formData[key] = fieldValue === 'true';
          } else if (['level', 'order'].includes(key)) {
            formData[key] = fieldValue ? parseInt(fieldValue) : undefined;
          } else {
            formData[key] = fieldValue;
          }
          console.log(`📝 Form field added: ${key} = ${fieldValue}`);
        }
      }
      
      console.log('📝 Extracted form data:', formData);

      // Handle image upload if provided
      if (imageFile) {
        // Get current menu item to delete old image
        const currentMenuItem = await this.menuService.findOne(id);
        
        // Upload new image
        const imagePath = await this.fileUploadService.uploadFile(imageFile, 'menu-items');
        formData.image = imagePath;
        
        // Delete old image if it exists
        if (currentMenuItem.image) {
          await this.fileUploadService.deleteFile(currentMenuItem.image);
        }
      }

      // Get user ID from request (you may need to implement this based on your auth system)
      const userId = (request as any).user?.id || 'system';
      
      console.log('🖼️ Image file:', imageFile ? 'Present' : 'Not provided');

      // Update menu item
      console.log('✅ Updating menu item with:', formData);
      return this.menuService.update(id, formData, userId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update menu item: ' + error.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Soft delete a menu item (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Soft delete a menu item.'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 204,
    description: 'Menu item soft deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  remove(@Param('id') id: string, @Req() request: FastifyRequest): Promise<void> {
    // Get user ID from request (you may need to implement this based on your auth system)
    const userId = (request as any).user?.id || 'system';
    return this.menuService.remove(id, userId);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Hard delete a menu item (Authorized: SUPER_ADMIN)',
    description: '🔒 Requires SUPER_ADMIN. Permanently delete a menu item from the database.'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 204,
    description: 'Menu item permanently deleted',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID or cannot hard delete menu item with children',
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
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to hard delete menu item',
  })
  async hardDelete(@Param('id') id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      await this.menuService.hardDelete(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to hard delete menu item: ' + error.message);
    }
  }

  @Patch(':id/delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Mark a menu item as deleted (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Mark a menu item as deleted (soft delete).'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item soft deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID',
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
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to soft delete menu item',
  })
  async softDelete(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      const userId = (request as any).user?.id || 'system';
      if (!userId) {
        throw new UnauthorizedException('User ID not found in request');
      }
      await this.menuService.softDelete(id, userId);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to soft delete menu item: ' + error.message);
    }
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Restore a soft-deleted menu item (Authorized: ADMIN, SUPER_ADMIN)',
    description: '🔒 Requires ADMIN or SUPER_ADMIN. Restore a soft-deleted menu item.'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item restored successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID',
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
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to restore menu item',
  })
  async restore(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      const userId = (request as any).user?.id || 'system';
      if (!userId) {
        throw new UnauthorizedException('User ID not found in request');
      }
      await this.menuService.restore(id, userId);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to restore menu item: ' + error.message);
    }
  }

  @Patch(':id/toggle-status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Toggle menu item active status (Authorized: ADMIN)',
    description: '🔒 Requires ADMIN. Toggle menu item active status.'
  })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item status toggled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID',
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
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to toggle menu item status',
  })
  async toggleStatus(@Param('id') id: string, @Req() request: FastifyRequest) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      const userId = (request as any).user?.id || 'system';
      if (!userId) {
        throw new UnauthorizedException('User ID not found in request');
      }
      await this.menuService.toggleStatus(id, userId);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to toggle menu item status: ' + error.message);
    }
  }

  @Get(':id/children')
  @ApiOperation({ 
    summary: 'Get direct children of a menu item (Authorized: PUBLIC)',
    description: '🌐 PUBLIC - Get direct children of a menu item.'
  })
  @ApiParam({ name: 'id', description: 'Parent menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Children retrieved successfully',
    type: [MenuItemResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Parent menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch menu item children',
  })
  async findChildren(@Param('id') id: string): Promise<MenuItemResponseDto[]> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      return await this.menuService.findChildren(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch menu item children: ' + error.message);
    }
  }

  @Get(':id/tree')
  @ApiOperation({ 
    summary: 'Get a menu item tree (Authorized: PUBLIC)',
    description: '🌐 PUBLIC - Get a menu item with all recursive children (tree structure).'
  })
  @ApiParam({ name: 'id', description: 'Root menu item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu tree retrieved successfully',
    type: MenuItemTreeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid menu item ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch menu item tree',
  })
  async findTree(@Param('id') id: string): Promise<MenuItemTreeResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('Menu item ID is required');
      }
      return await this.menuService.findTree(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch menu item tree: ' + error.message);
    }
  }




}

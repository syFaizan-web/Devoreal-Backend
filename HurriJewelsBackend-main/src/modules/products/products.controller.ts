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
  BadRequestException
} from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get all products' })
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
  @ApiOperation({ summary: 'Get product by ID' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Create a new product' })
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'product', productIdField: 'id' })
  @ApiOperation({ summary: 'Update a product' })
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

  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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

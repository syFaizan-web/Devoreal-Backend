import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateAuthorDto, UpdateAuthorDto } from './dto/author.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active authors [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Authors retrieved successfully' })
  async findAll() {
    return this.prisma.author.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get author by ID [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Author retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  async findOne(@Param('id') id: string) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatar: true,
          },
        },
        articles: {
          where: {
            isActive: true,
            isDeleted: false,
            status: 'PUBLISHED',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!author || !author.isActive || author.isDeleted) {
      throw new Error('Author not found');
    }

    return author;
  }

  @Post()
  @Public()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'John Doe' },
        bio: { type: 'string', example: 'Expert jewelry consultant with over 10 years of experience...' },
        experience: { type: 'string', example: 'Senior Jewelery Consultant at Hurrijewels' },
        avatarFile: {
          type: 'string',
          format: 'binary',
          description: 'Author avatar image file (optional)'
        },
        userId: { type: 'string', example: 'user-id-here' }
      },
      required: ['displayName']
    }
  })
  @ApiOperation({ summary: 'Create a new author [Roles: PUBLIC]' })
  @ApiResponse({ status: 201, description: 'Author created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createAuthorDto: any, @Request() req: any) {
    try {
      console.log('📝 Processing author creation request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = req.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Extract avatar file from bodyFields
      let avatarFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        console.log(`🔍 Processing field: ${key}, has filename: ${!!(value as any)?.filename}, has value: ${(value as any)?.value !== undefined}`);
        
        if (key === 'avatarFile' && (value as any)?.filename) {
          // This is the avatar image file
          console.log('📷 Processing avatar file...');
          avatarFile = {
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
          };
          console.log(`📷 Avatar file processed: ${(value as any).filename}`);
        } else if ((value as any)?.value !== undefined) {
          // This is a form field
          formData[key] = (value as any).value;
          console.log(`📝 Form field added: ${key} = ${(value as any).value}`);
        }
      }
      
      console.log('🖼️ Avatar file:', avatarFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);
      
      // Handle avatar file upload if provided
      if (avatarFile) {
        // Add your file upload logic here
        formData.avatarUrl = `/uploads/authors/${avatarFile.filename}`;
      }

      console.log('✅ Creating author with:', formData);

      return this.prisma.author.create({
        data: {
          displayName: formData.displayName,
          bio: formData.bio,
          experience: formData.experience,
          avatarUrl: formData.avatarUrl,
          userId: formData.userId,
          createdBy: req?.user?.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error('Failed to create author: ' + error.message);
    }
  }

  @Patch(':id')
  @Public()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Updated John Doe' },
        bio: { type: 'string', example: 'Updated bio...' },
        experience: { type: 'string', example: 'Updated experience...' },
        avatarFile: {
          type: 'string',
          format: 'binary',
          description: 'Author avatar image file (optional)'
        },
        userId: { type: 'string', example: 'updated-user-id' }
      }
    }
  })
  @ApiOperation({ summary: 'Update an author [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Author updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  async update(
    @Param('id') id: string,
    @Body() updateAuthorDto: any,
    @Request() req: any,
  ) {
    try {
      console.log('📝 Processing author update request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = req.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Extract avatar file from bodyFields
      let avatarFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        console.log(`🔍 Processing field: ${key}, has filename: ${!!(value as any)?.filename}, has value: ${(value as any)?.value !== undefined}`);
        
        if (key === 'avatarFile' && (value as any)?.filename) {
          // This is the avatar image file
          console.log('📷 Processing avatar file...');
          avatarFile = {
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
          };
          console.log(`📷 Avatar file processed: ${(value as any).filename}`);
        } else if ((value as any)?.value !== undefined) {
          // This is a form field
          formData[key] = (value as any).value;
          console.log(`📝 Form field added: ${key} = ${(value as any).value}`);
        }
      }
      
      console.log('🖼️ Avatar file:', avatarFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);

      const author = await this.prisma.author.findUnique({
        where: { id },
      });

      if (!author || !author.isActive || author.isDeleted) {
        throw new Error('Author not found');
      }

      // Handle avatar file upload if provided
      if (avatarFile) {
        // Add your file upload logic here
        formData.avatarUrl = `/uploads/authors/${avatarFile.filename}`;
      }

      const updateData = { ...formData, updatedBy: req?.user?.id };

      console.log('✅ Updating author with:', updateData);

      return this.prisma.author.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to update author: ' + error.message);
    }
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an author [Roles: PUBLIC]' })
  @ApiResponse({ status: 204, description: 'Author deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  async remove(@Param('id') id: string, @Request() req) {
    const author = await this.prisma.author.findUnique({
      where: { id },
    });

    if (!author || !author.isActive || author.isDeleted) {
      throw new Error('Author not found');
    }

    await this.prisma.author.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
    });
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hard delete an author [Roles: SUPER_ADMIN]' })
  @ApiResponse({ status: 204, description: 'Author hard deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  async removeHard(@Param('id') id: string) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) {
      throw new Error('Author not found');
    }
    await this.prisma.author.delete({ where: { id } });
  }

  @Patch(':id/restore')
  @Public()
  @ApiOperation({ summary: 'Restore a soft-deleted author [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Author restored successfully' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  async restore(@Param('id') id: string, @Request() req) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) {
      throw new Error('Author not found');
    }
    return this.prisma.author.update({
      where: { id },
      data: {
        isDeleted: false,
        isActive: true,
        deletedAt: null as any,
        deletedBy: null as any,
        updatedBy: req?.user?.id,
      },
    });
  }
}


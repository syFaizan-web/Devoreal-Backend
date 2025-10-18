import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { FileUploadService } from '../../common/file-upload/file-upload.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto } from './dto/article-query.dto';
import { ArticleResponse, PaginatedArticleResponse } from './entities/article.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all published articles with pagination and filters [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully', type: PaginatedArticleResponse })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'categorySlug', required: false, description: 'Filter by category slug' })
  @ApiQuery({ name: 'tagSlug', required: false, description: 'Filter by tag slug' })
  @ApiQuery({ name: 'sort', required: false, enum: ['latest', 'popular', 'featured'], description: 'Sort order' })
  @ApiQuery({ name: 'minRead', required: false, description: 'Minimum read time in minutes' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(@Query() query: ArticleQueryDto): Promise<PaginatedArticleResponse> {
    return this.articlesService.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured articles [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Featured articles retrieved successfully', type: [ArticleResponse] })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of featured articles to return', type: Number })
  async findFeatured(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number): Promise<ArticleResponse[]> {
    return this.articlesService.findFeatured(limit || 5);
  }

  @Public()
  @Get('recent')
  @ApiOperation({ summary: 'Get recent articles [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Recent articles retrieved successfully', type: [ArticleResponse] })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recent articles to return', type: Number })
  async findRecent(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number): Promise<ArticleResponse[]> {
    return this.articlesService.findRecent(limit || 5);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Get popular articles (last 30 days) [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Popular articles retrieved successfully', type: [ArticleResponse] })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of popular articles to return', type: Number })
  async findPopular(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number): Promise<ArticleResponse[]> {
    return this.articlesService.findPopular(limit || 5);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get article by slug [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully', type: ArticleResponse })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  async findOne(@Param('slug') slug: string, @Request() req): Promise<ArticleResponse> {
    const article = await this.articlesService.findOne(slug);
    
    // Track view (non-blocking)
    const ipHash = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.id;
    
    // Don't await this to avoid blocking the response
    this.articlesService.incrementViews(slug, ipHash, userId).catch(error => {
      console.error('Error tracking view:', error);
    });

    return article;
  }

  @Post()
  @Public()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'The Ultimate Guide to Diamond Engagement Rings' },
        slug: { type: 'string', example: 'ultimate-guide-diamond-engagement-rings' },
        summary: { type: 'string', example: 'Discover the essential factors to consider when choosing the perfect diamond engagement ring...' },
        content: { 
          type: 'object', 
          description: 'Rich Text Editor content blocks with placeholders for media uploads',
          example: {
            blocks: [
              {
                type: 'heading',
                data: { text: 'Introduction', level: 2 },
                id: 'heading-1'
              },
              {
                type: 'paragraph',
                data: { text: 'Diamonds are formed deep within the Earth...' },
                id: 'paragraph-1'
              },
              {
                type: 'image',
                data: {
                  src: 'PLACEHOLDER_IMAGE_1', // Will be replaced with uploaded file
                  alt: 'Beautiful diamond engagement ring',
                  caption: 'A stunning diamond engagement ring',
                  width: '100%',
                  height: 'auto',
                  alignment: 'center'
                },
                id: 'image-1'
              },
              {
                type: 'video',
                data: {
                  src: 'PLACEHOLDER_VIDEO_1', // Will be replaced with uploaded file
                  poster: 'PLACEHOLDER_POSTER_1', // Will be replaced with uploaded file
                  caption: 'Diamond formation process',
                  autoplay: false,
                  controls: true,
                  width: '100%',
                  height: '400px'
                },
                id: 'video-1'
              }
            ],
            version: '1.0',
            lastModified: '2024-01-01T00:00:00Z'
          }
        },
        coverFile: { type: 'string', format: 'binary' },
        coverAlt: { type: 'string', example: 'Diamond ring in velvet box' },
        readMinutes: { type: 'number', example: 8 },
        isFeatured: { type: 'boolean', example: true },
        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED' },
        isActive: { type: 'boolean', example: true },
        metaTitle: { type: 'string', example: 'Diamond Engagement Rings Guide 2025' },
        metaDescription: { type: 'string', example: 'Understand the 4Cs...' },
        metaImageUrl: { type: 'string', example: 'https://example.com/image.jpg' },
        language: { type: 'string', example: 'en' },
        categorySlugs: { type: 'array', items: { type: 'string' }, example: ['jewelry'] },
        tagSlugs: { type: 'array', items: { type: 'string' }, example: ['diamond', 'engagement'] },
        categoryIds: { type: 'array', items: { type: 'string' }, example: ['cat-id-1', 'cat-id-2'] },
        tagIds: { type: 'array', items: { type: 'string' }, example: ['tag-id-1', 'tag-id-2'] },
        authorId: { type: 'string', example: 'author-id-here' }
      },
      required: ['title', 'summary', 'content', 'readMinutes', 'authorId']
    }
  })
  @ApiOperation({ summary: 'Create a new article with RTE JSON structure [Roles: PUBLIC]' })
  @ApiResponse({ status: 201, description: 'Article created successfully', type: ArticleResponse })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createArticleDto: any,
    @Request() req,
  ): Promise<ArticleResponse> {
    // Build a sanitized DTO from Fastify attachFieldsToBody objects
    const bodyFields = (req?.body as any) || {};
    const formData: any = {};

    // Arrays to store uploaded files for content blocks
    const uploadedImages: string[] = [];
    const uploadedVideos: string[] = [];
    const uploadedPosters: string[] = [];

    for (const [key, value] of Object.entries(bodyFields)) {
      const v: any = value as any;
      if (v?.filename) {
        // This is a file upload
        const file: Express.Multer.File = {
          fieldname: v.fieldname,
          originalname: v.filename,
          encoding: v.encoding,
          mimetype: v.mimetype,
          size: v.file?.bytesRead || v._buf?.length || 0,
          buffer: v._buf,
          stream: v.file,
          destination: '',
          filename: v.filename,
          path: '',
        } as any;

        // Upload file and store path
        const relPath = await this.fileUploadService.uploadFile(file, 'article-content');

        // Categorize files based on field name (dynamic field names)
        if (key.startsWith('contentImages') || key.includes('image')) {
          uploadedImages.push(relPath);
        } else if (key.startsWith('contentVideos') || key.includes('video')) {
          uploadedVideos.push(relPath);
        } else if (key.startsWith('contentImagePosters') || key.includes('poster')) {
          uploadedPosters.push(relPath);
        } else if (key === 'coverFile') {
          formData.coverUrl = relPath;
          if (!formData.coverAlt) formData.coverAlt = v.filename;
        }
      } else if (v?.value !== undefined) {
        // This is a form field
        const raw = v.value as string;
        if (['categorySlugs','tagSlugs','categoryIds','tagIds'].includes(key)) {
          try { formData[key] = JSON.parse(raw); } catch { formData[key] = raw ? raw.split(',').map(s => s.trim()) : []; }
        } else if (['isFeatured','isActive'].includes(key)) {
          formData[key] = raw === 'true' || raw === true as any;
        } else if (['readMinutes'].includes(key)) {
          formData[key] = raw ? parseInt(raw) : undefined;
        } else if (key === 'content') {
          // Parse the RTE JSON content
          try {
            formData[key] = JSON.parse(raw);
          } catch (error) {
            throw new BadRequestException('Invalid RTE content JSON format');
          }
        } else {
          formData[key] = raw;
        }
      }
    }

    // Replace placeholders in content blocks with actual file paths
    if (formData.content && formData.content.blocks) {
      let imageIndex = 0;
      let videoIndex = 0;
      let posterIndex = 0;

      formData.content.blocks.forEach((block: any) => {
        if (block.type === 'image' && block.data.src && block.data.src.startsWith('PLACEHOLDER_IMAGE_')) {
          if (uploadedImages[imageIndex]) {
            block.data.src = uploadedImages[imageIndex];
            imageIndex++;
          }
        } else if (block.type === 'video') {
          if (block.data.src && block.data.src.startsWith('PLACEHOLDER_VIDEO_') && uploadedVideos[videoIndex]) {
            block.data.src = uploadedVideos[videoIndex];
            videoIndex++;
          }
          if (block.data.poster && block.data.poster.startsWith('PLACEHOLDER_POSTER_') && uploadedPosters[posterIndex]) {
            block.data.poster = uploadedPosters[posterIndex];
            posterIndex++;
          }
        } else if (block.type === 'image-gallery' && block.data.images) {
          // Handle image gallery placeholders
          block.data.images = block.data.images.map((imgSrc: string) => {
            if (imgSrc.startsWith('PLACEHOLDER_IMAGE_') && uploadedImages[imageIndex]) {
              const actualSrc = uploadedImages[imageIndex];
              imageIndex++;
              return actualSrc;
            }
            return imgSrc;
          });
        } else if (block.type === 'video-gallery' && block.data.videos) {
          // Handle video gallery placeholders
          block.data.videos = block.data.videos.map((video: any) => {
            if (video.src && video.src.startsWith('PLACEHOLDER_VIDEO_') && uploadedVideos[videoIndex]) {
              video.src = uploadedVideos[videoIndex];
              videoIndex++;
            }
            if (video.poster && video.poster.startsWith('PLACEHOLDER_POSTER_') && uploadedPosters[posterIndex]) {
              video.poster = uploadedPosters[posterIndex];
              posterIndex++;
            }
            return video;
          });
        }
      });
    }

    // If not using attachFieldsToBody (pure JSON), fall back to original dto
    const payload = Object.keys(formData).length ? formData : createArticleDto;
    return this.articlesService.create(payload, req?.user?.id);
  }

  @Patch(':id')
  @Public()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Updated Article Title' },
        slug: { type: 'string', example: 'updated-article-slug' },
        summary: { type: 'string', example: 'Updated article summary...' },
        content: { 
          type: 'object', 
          description: 'Rich Text Editor content blocks with placeholders for media uploads (optional for updates)',
          example: {
            blocks: [
              {
                type: 'heading',
                data: { text: 'Updated Introduction', level: 2 },
                id: 'heading-1'
              },
              {
                type: 'paragraph',
                data: { text: 'Updated article content...' },
                id: 'paragraph-1'
              },
              {
                type: 'image',
                data: {
                  src: 'PLACEHOLDER_IMAGE_1', // Will be replaced with uploaded file
                  alt: 'Updated image',
                  caption: 'Updated image caption',
                  width: '100%',
                  height: 'auto',
                  alignment: 'center'
                },
                id: 'image-updated-1'
              }
            ],
            version: '1.1',
            lastModified: '2024-01-01T00:00:00Z'
          }
        },
        coverFile: { type: 'string', format: 'binary' },
        coverAlt: { type: 'string', example: 'Updated cover image alt text' },
        readMinutes: { type: 'number', example: 10 },
        isFeatured: { type: 'boolean', example: true },
        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED' },
        isActive: { type: 'boolean', example: true },
        metaTitle: { type: 'string', example: 'Updated Meta Title' },
        metaDescription: { type: 'string', example: 'Updated meta description...' },
        metaImageUrl: { type: 'string', example: 'https://example.com/updated-image.jpg' },
        language: { type: 'string', example: 'en' },
        categorySlugs: { type: 'array', items: { type: 'string' }, example: ['updated-category'] },
        tagSlugs: { type: 'array', items: { type: 'string' }, example: ['updated-tag'] },
        categoryIds: { type: 'array', items: { type: 'string' }, example: ['cat-id-1'] },
        tagIds: { type: 'array', items: { type: 'string' }, example: ['tag-id-1'] },
        authorId: { type: 'string', example: 'updated-author-id' }
      }
    }
  })
  @ApiOperation({ summary: 'Update an article with RTE JSON structure [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Article updated successfully', type: ArticleResponse })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: any,
    @Request() req: any,
  ): Promise<ArticleResponse> {
    try {
      console.log('📝 Processing article update request...');
      
      // Extract form fields from request.body (since attachFieldsToBody: true)
      const bodyFields = req.body as any || {};
      console.log('📋 Form fields from request.body:', bodyFields);
      
      // Arrays to store uploaded files for content blocks
      const uploadedImages: string[] = [];
      const uploadedVideos: string[] = [];
      const uploadedPosters: string[] = [];
      let coverFile = null;
      const formData: any = {};
      
      for (const [key, value] of Object.entries(bodyFields)) {
        console.log(`🔍 Processing field: ${key}, has filename: ${!!(value as any)?.filename}, has value: ${(value as any)?.value !== undefined}`);
        
        if ((value as any)?.filename) {
          // This is a file upload
          const file: Express.Multer.File = {
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
          } as any;

          // Upload file and store path
          const relPath = await this.fileUploadService.uploadFile(file, 'article-content');

          // Categorize files based on field name (dynamic field names)
          if (key.startsWith('contentImages') || key.includes('image')) {
            uploadedImages.push(relPath);
          } else if (key.startsWith('contentVideos') || key.includes('video')) {
            uploadedVideos.push(relPath);
          } else if (key.startsWith('contentImagePosters') || key.includes('poster')) {
            uploadedPosters.push(relPath);
          } else if (key === 'coverFile') {
            coverFile = file;
            formData.coverUrl = relPath;
            if (!formData.coverAlt) formData.coverAlt = (value as any).filename;
          }
        } else if ((value as any)?.value !== undefined) {
          // This is a form field
          const fieldValue = (value as any).value;
          
          // Parse array fields
          if (['categorySlugs', 'tagSlugs', 'categoryIds', 'tagIds'].includes(key)) {
            try {
              formData[key] = JSON.parse(fieldValue);
            } catch {
              formData[key] = fieldValue ? fieldValue.split(',').map((s: string) => s.trim()) : [];
            }
          } else if (['isFeatured', 'isActive'].includes(key)) {
            formData[key] = fieldValue === 'true';
          } else if (['readMinutes'].includes(key)) {
            formData[key] = fieldValue ? parseInt(fieldValue) : undefined;
          } else if (key === 'content') {
            // Parse the RTE JSON content
            try {
              formData[key] = JSON.parse(fieldValue);
            } catch (error) {
              throw new BadRequestException('Invalid RTE content JSON format');
            }
          } else {
            formData[key] = fieldValue;
          }
          console.log(`🔢 Form field added: ${key} = ${fieldValue}`);
        }
      }
      
      console.log('🖼️ Cover file:', coverFile ? 'Present' : 'Not provided');
      console.log('📝 Extracted form data:', formData);
      
      if (coverFile) {
        const relativePath = await this.fileUploadService.uploadFile(coverFile as any, 'article-images');
        formData.coverUrl = relativePath;
        formData.coverAlt = formData.coverAlt || (coverFile as any).originalname || (coverFile as any).filename;
      }
      
      delete formData.coverFile;

      // Replace placeholders in content blocks with actual file paths
      if (formData.content && formData.content.blocks) {
        let imageIndex = 0;
        let videoIndex = 0;
        let posterIndex = 0;

        formData.content.blocks.forEach((block: any) => {
          if (block.type === 'image' && block.data.src && block.data.src.startsWith('PLACEHOLDER_IMAGE_')) {
            if (uploadedImages[imageIndex]) {
              block.data.src = uploadedImages[imageIndex];
              imageIndex++;
            }
          } else if (block.type === 'video') {
            if (block.data.src && block.data.src.startsWith('PLACEHOLDER_VIDEO_') && uploadedVideos[videoIndex]) {
              block.data.src = uploadedVideos[videoIndex];
              videoIndex++;
            }
            if (block.data.poster && block.data.poster.startsWith('PLACEHOLDER_POSTER_') && uploadedPosters[posterIndex]) {
              block.data.poster = uploadedPosters[posterIndex];
              posterIndex++;
            }
          } else if (block.type === 'image-gallery' && block.data.images) {
            // Handle image gallery placeholders
            block.data.images = block.data.images.map((imgSrc: string) => {
              if (imgSrc.startsWith('PLACEHOLDER_IMAGE_') && uploadedImages[imageIndex]) {
                const actualSrc = uploadedImages[imageIndex];
                imageIndex++;
                return actualSrc;
              }
              return imgSrc;
            });
          } else if (block.type === 'video-gallery' && block.data.videos) {
            // Handle video gallery placeholders
            block.data.videos = block.data.videos.map((video: any) => {
              if (video.src && video.src.startsWith('PLACEHOLDER_VIDEO_') && uploadedVideos[videoIndex]) {
                video.src = uploadedVideos[videoIndex];
                videoIndex++;
              }
              if (video.poster && video.poster.startsWith('PLACEHOLDER_POSTER_') && uploadedPosters[posterIndex]) {
                video.poster = uploadedPosters[posterIndex];
                posterIndex++;
              }
              return video;
            });
          }
        });
      }
      
      console.log('✅ Updating article with:', formData);
      
      return this.articlesService.update(id, formData, req?.user?.id, req?.user?.role);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update article: ' + error.message);
    }
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an article [Roles: PUBLIC]' })
  @ApiResponse({ status: 204, description: 'Article deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    const userId = req?.user?.id || 'system';
    const userRole = req?.user?.role || 'PUBLIC';
    return this.articlesService.remove(id, userId, userRole);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hard delete an article [Roles: SUPER_ADMIN]' })
  @ApiResponse({ status: 204, description: 'Article hard deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async removeHard(@Param('id') id: string): Promise<void> {
    return this.articlesService.removeHard(id);
  }

  @Patch(':id/restore')
  @Public()
  @ApiOperation({ summary: 'Restore a soft-deleted article [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Article restored successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async restore(@Param('id') id: string, @Request() req): Promise<any> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    
    if (!article) {
      throw new BadRequestException('Article not found');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedBy: req?.user?.id || 'system',
      },
    });
  }
}
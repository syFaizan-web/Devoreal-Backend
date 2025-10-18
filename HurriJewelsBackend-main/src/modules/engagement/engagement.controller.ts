import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
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
import { EngagementService } from './engagement.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ViewEventDto, LikeDto, BookmarkDto, NewsletterSubscribeDto, EngagementEntityType } from './dto/engagement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('engagement')
@Controller('engagement')
export class EngagementController {
  constructor(
    private readonly engagementService: EngagementService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getUserIdFromReq(req: any): string | undefined {
    // Prefer req.user.id if guard populated it
    const guardUserId = req?.user?.id;
    if (guardUserId) return guardUserId;
    // Fallback: read Authorization header and verify
    const auth: string | undefined = req?.headers?.authorization || req?.headers?.Authorization;
    if (!auth || !auth.startsWith('Bearer ')) return undefined;
    const token = auth.substring(7);
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload: any = this.jwtService.verify(token, { secret });
      return payload?.sub || payload?.id || payload?.userId;
    } catch {
      return undefined;
    }
  }

  @Post('view')
  @Public()
  @ApiConsumes('application/json')
  @ApiBody({ type: ViewEventDto })
  @ApiOperation({ summary: 'Track a view event [Roles: PUBLIC]' })
  @ApiResponse({ status: 201, description: 'View tracked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async trackView(@Body() viewEventDto: ViewEventDto, @Request() req): Promise<void> {
    const ipHash = this.engagementService.generateIpHash(req.ip || req.connection.remoteAddress || 'unknown');
    const userId = req.user?.id;
    return this.engagementService.trackView(viewEventDto, ipHash, userId);
  }

  @Post('likes/toggle')
  @Public()
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('application/json')
  @ApiBody({ type: LikeDto })
  @ApiOperation({ summary: 'Toggle like on an entity [Roles: USER, ADMIN, SUPER_ADMIN]' })
  @ApiResponse({ status: 201, description: 'Like toggled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async toggleLike(@Body() likeDto: LikeDto, @Request() req): Promise<{ liked: boolean; likesCount: number }> {
    const userId = this.getUserIdFromReq(req);
    return this.engagementService.toggleLike(likeDto, userId);
  }

  @Post('bookmark/toggle')
  @Public()
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('application/json')
  @ApiBody({ type: BookmarkDto })
  @ApiOperation({ summary: 'Toggle bookmark on an entity [Roles: USER, ADMIN, SUPER_ADMIN]' })
  @ApiResponse({ status: 201, description: 'Bookmark toggled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async toggleBookmark(@Body() bookmarkDto: BookmarkDto, @Request() req): Promise<{ bookmarked: boolean }> {
    const userId = this.getUserIdFromReq(req);
    return this.engagementService.toggleBookmark(bookmarkDto, userId);
  }

  @Get('likes')
  @Public()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user likes [Roles: USER, ADMIN, SUPER_ADMIN]' })
  @ApiResponse({ status: 200, description: 'User likes retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'entityType', required: false, enum: EngagementEntityType, description: 'Filter by entity type' })
  async getUserLikes(
    @Request() req,
    @Query('entityType') entityType?: EngagementEntityType,
  ): Promise<any[]> {
    const userId = this.getUserIdFromReq(req);
    if (!userId) return [];
    return this.engagementService.getUserLikes(userId as any, entityType);
  }

  @Get('bookmarks')
  @Public()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user bookmarks [Roles: USER, ADMIN, SUPER_ADMIN]' })
  @ApiResponse({ status: 200, description: 'User bookmarks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'entityType', required: false, enum: EngagementEntityType, description: 'Filter by entity type' })
  async getUserBookmarks(
    @Request() req,
    @Query('entityType') entityType?: EngagementEntityType,
  ): Promise<any[]> {
    const userId = this.getUserIdFromReq(req);
    if (!userId) return [];
    return this.engagementService.getUserBookmarks(userId as any, entityType);
  }

  @Get('trending-topics')
  @Public()
  @ApiOperation({ summary: 'Get trending topics (categories and tags) [Roles: PUBLIC]' })
  @ApiResponse({ status: 200, description: 'Trending topics retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items to return per type', type: Number })
  async getTrendingTopics(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<any> {
    return this.engagementService.getTrendingTopics(days || 14, limit || 10);
  }
}

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post('subscribe')
  @Public()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: NewsletterSubscribeDto })
  @ApiOperation({ summary: 'Subscribe to newsletter [Roles: PUBLIC]' })
  @ApiResponse({ status: 201, description: 'Successfully subscribed to newsletter' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async subscribe(@Body() subscribeDto: NewsletterSubscribeDto): Promise<void> {
    return this.engagementService.subscribeToNewsletter(subscribeDto);
  }
}


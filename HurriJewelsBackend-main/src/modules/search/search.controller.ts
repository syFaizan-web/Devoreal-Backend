import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { SearchResponse } from './entities/search.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search articles, categories, and tags' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully', type: SearchResponse })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, description: 'Search suggestions retrieved successfully', type: [String] })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of suggestions to return' })
  async getSuggestions(
    @Query('q') query: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<string[]> {
    return this.searchService.getSearchSuggestions(query, limit || 5);
  }
}


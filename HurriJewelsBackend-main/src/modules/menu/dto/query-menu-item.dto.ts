import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMenuItemDto {
  @ApiPropertyOptional({ description: 'Filter by active status (true/false)' })
  @IsOptional()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Filter by parent ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;
}

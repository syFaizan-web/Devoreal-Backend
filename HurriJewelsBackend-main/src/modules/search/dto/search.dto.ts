import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query', example: 'technology trends' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiProperty({ description: 'Page number for pagination', required: false, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}


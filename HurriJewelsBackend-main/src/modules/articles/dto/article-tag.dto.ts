import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateArticleTagDto {
  @ApiProperty({ description: 'Tag name', example: 'JavaScript' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}

export class UpdateArticleTagDto {
  @ApiProperty({ description: 'Tag name', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;
}


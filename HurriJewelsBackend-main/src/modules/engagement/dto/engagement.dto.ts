import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsEmail, IsOptional } from 'class-validator';

export enum EngagementEntityType {
  ARTICLE = 'ARTICLE',
  PRODUCT = 'PRODUCT',
}

export class ViewEventDto {
  @ApiProperty({ description: 'Entity type', enum: EngagementEntityType })
  @IsEnum(EngagementEntityType)
  entityType: EngagementEntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class LikeDto {
  @ApiProperty({ description: 'Entity type', enum: EngagementEntityType })
  @IsEnum(EngagementEntityType)
  entityType: EngagementEntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class BookmarkDto {
  @ApiProperty({ description: 'Entity type', enum: EngagementEntityType })
  @IsEnum(EngagementEntityType)
  entityType: EngagementEntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class NewsletterSubscribeDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Source of subscription', required: false, example: 'blog-footer' })
  @IsString()
  @IsOptional()
  source?: string;
}


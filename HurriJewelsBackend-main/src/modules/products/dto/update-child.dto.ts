import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChildDto {
  @ApiProperty({ 
    description: 'Tab name to update',
    enum: [
      'basic', 
      'pricing', 
      'media', 
      'seo', 
      'attributesTag', 
      'variants', 
      'inventory', 
      'reels', 
      'itemDetails', 
      'shippingPolicies'
    ]
  })
  @IsString({ message: 'Tab name must be a string' })
  tabName: string;

  @ApiProperty({ description: 'Data to update for the specified tab' })
  @IsObject({ message: 'Data must be an object' })
  data: any;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @IsOptional()
  @IsString({ message: 'Updated by must be a string' })
  updatedBy?: string;
}

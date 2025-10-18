import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ description: 'Business name' })
  @IsString({ message: 'Business name must be a string' })
  businessName: string;

  @ApiPropertyOptional({ description: 'Business description' })
  @IsOptional()
  @IsString({ message: 'Business description must be a string' })
  businessDescription?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsOptional()
  @IsString({ message: 'Business address must be a string' })
  businessAddress?: string;

  @ApiPropertyOptional({ description: 'Business phone' })
  @IsOptional()
  @IsString({ message: 'Business phone must be a string' })
  businessPhone?: string;

  @ApiPropertyOptional({ description: 'Business email' })
  @IsOptional()
  @IsString({ message: 'Business email must be a string' })
  businessEmail?: string;

  @ApiPropertyOptional({ description: 'Tax ID' })
  @IsOptional()
  @IsString({ message: 'Tax ID must be a string' })
  taxId?: string;

  @ApiPropertyOptional({ description: 'Whether the vendor is verified', default: false })
  @IsOptional()
  @IsBoolean({ message: 'isVerified must be a boolean' })
  isVerified?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether the vendor is active', default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Vendor rating', minimum: 0, maximum: 5, default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(0, { message: 'Rating must be at least 0' })
  rating?: number = 0;

  @ApiPropertyOptional({ description: 'Total sales amount', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Total sales must be a number' })
  @Min(0, { message: 'Total sales must be at least 0' })
  totalSales?: number = 0;
}

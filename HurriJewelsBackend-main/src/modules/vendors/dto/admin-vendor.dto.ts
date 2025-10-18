import { 
  IsString, 
  IsOptional, 
  IsNotEmpty, 
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum VendorVerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export class VendorListQueryDto {
  @ApiPropertyOptional({ 
    description: 'Filter by verification status',
    enum: VendorVerificationStatus,
    example: 'PENDING'
  })
  @IsOptional()
  @IsEnum(VendorVerificationStatus, { 
    message: 'Status must be one of: PENDING, APPROVED, REJECTED' 
  })
  status?: VendorVerificationStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by vendor active status',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Search by business name or email',
    example: 'jewelry'
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Page number for pagination',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'businessName', 'rating', 'totalSales']
  })
  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  @Transform(({ value }) => value?.trim())
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ 
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class VendorListItemDto {
  @ApiProperty({ 
    description: 'Vendor ID',
    example: 'clx1234567890'
  })
  id: string;

  @ApiProperty({ 
    description: 'User ID',
    example: 'clx1234567890'
  })
  userId: string;

  @ApiProperty({ 
    description: 'Business name',
    example: 'Premium Jewelry Store'
  })
  businessName: string;

  @ApiPropertyOptional({ 
    description: 'Business description',
    example: 'High-quality jewelry and accessories'
  })
  businessDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Business email',
    example: 'contact@premiumjewelry.com'
  })
  businessEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Business phone',
    example: '+1-555-123-4567'
  })
  businessPhone?: string;

  @ApiProperty({ 
    description: 'Whether vendor is verified',
    example: true
  })
  isVerified: boolean;

  @ApiProperty({ 
    description: 'Whether vendor is active',
    example: true
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Vendor rating',
    example: 4.5
  })
  rating: number;

  @ApiProperty({ 
    description: 'Total sales amount',
    example: 50000.00
  })
  totalSales: number;

  @ApiProperty({ 
    description: 'Vendor creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Vendor last update date',
    example: '2024-01-15T00:00:00.000Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({ 
    description: 'User information',
    type: 'object'
  })
  user?: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    isEmailVerified: boolean;
    createdAt: Date;
  };

  @ApiPropertyOptional({ 
    description: 'Verification information',
    type: 'object'
  })
  verification?: {
    id: string;
    status: string;
    submittedAt: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
  };
}

export class VendorListResponseDto {
  @ApiProperty({ 
    description: 'List of vendors',
    type: [VendorListItemDto]
  })
  vendors: VendorListItemDto[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    type: 'object'
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ 
    description: 'Filter summary',
    type: 'object'
  })
  filters: {
    status?: string;
    isActive?: boolean;
    search?: string;
    sortBy: string;
    sortOrder: string;
  };
}

export class VendorDetailDto {
  @ApiProperty({ 
    description: 'Vendor ID',
    example: 'clx1234567890'
  })
  id: string;

  @ApiProperty({ 
    description: 'User ID',
    example: 'clx1234567890'
  })
  userId: string;

  @ApiProperty({ 
    description: 'Business name',
    example: 'Premium Jewelry Store'
  })
  businessName: string;

  @ApiPropertyOptional({ 
    description: 'Business description',
    example: 'High-quality jewelry and accessories'
  })
  businessDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Business address',
    example: '123 Main Street, New York, NY 10001'
  })
  businessAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Business email',
    example: 'contact@premiumjewelry.com'
  })
  businessEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Business phone',
    example: '+1-555-123-4567'
  })
  businessPhone?: string;

  @ApiPropertyOptional({ 
    description: 'Tax ID',
    example: '12-3456789'
  })
  taxId?: string;

  @ApiProperty({ 
    description: 'Whether vendor is verified',
    example: true
  })
  isVerified: boolean;

  @ApiProperty({ 
    description: 'Whether vendor is active',
    example: true
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Vendor rating',
    example: 4.5
  })
  rating: number;

  @ApiProperty({ 
    description: 'Total sales amount',
    example: 50000.00
  })
  totalSales: number;

  @ApiProperty({ 
    description: 'Vendor creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Vendor last update date',
    example: '2024-01-15T00:00:00.000Z'
  })
  updatedAt: Date;

  @ApiProperty({ 
    description: 'User information',
    type: 'object'
  })
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    isEmailVerified: boolean;
    createdAt: Date;
  };

  @ApiPropertyOptional({ 
    description: 'Verification information',
    type: 'object'
  })
  verification?: {
    id: string;
    status: string;
    businessLicense?: string;
    taxDocument?: string;
    identityDocument?: string;
    bankStatement?: string;
    additionalDocs?: string;
    submittedAt: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
    reviewedBy?: string;
  };

  @ApiProperty({ 
    description: 'Store information',
    type: 'array',
    items: { type: 'object' }
  })
  stores: any[];
}

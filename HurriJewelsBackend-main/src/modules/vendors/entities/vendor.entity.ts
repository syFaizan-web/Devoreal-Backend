import { ApiProperty } from '@nestjs/swagger';

export class Vendor {
  @ApiProperty({ description: 'Unique vendor identifier' })
  id: string;

  @ApiProperty({ description: 'Business name' })
  businessName: string;

  @ApiProperty({ description: 'Business description', required: false })
  businessDescription?: string;

  @ApiProperty({ description: 'Business address', required: false })
  businessAddress?: string;

  @ApiProperty({ description: 'Business phone', required: false })
  businessPhone?: string;

  @ApiProperty({ description: 'Business email', required: false })
  businessEmail?: string;

  @ApiProperty({ description: 'Tax ID', required: false })
  taxId?: string;

  @ApiProperty({ description: 'Whether the vendor is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Whether the vendor is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Vendor rating' })
  rating: number;

  @ApiProperty({ description: 'Total sales amount' })
  totalSales: number;

  @ApiProperty({ description: 'Vendor creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Vendor last update timestamp' })
  updatedAt: Date;

  // Relations
  @ApiProperty({ description: 'Associated user ID' })
  userId: string;
}

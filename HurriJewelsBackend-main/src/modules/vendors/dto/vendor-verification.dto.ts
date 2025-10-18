import { 
  IsString, 
  IsOptional, 
  IsNotEmpty, 
  IsArray, 
  IsUrl,
  MaxLength,
  MinLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SubmitVerificationDto {
  @ApiProperty({ 
    description: 'Business license document URL or file path',
    example: 'https://example.com/business-license.pdf'
  })
  @IsOptional()
  @IsString({ message: 'Business license must be a string' })
  @IsUrl({}, { message: 'Business license must be a valid URL' })
  @MaxLength(500, { message: 'Business license URL must not exceed 500 characters' })
  businessLicense?: string;

  @ApiProperty({ 
    description: 'Tax document URL or file path',
    example: 'https://example.com/tax-document.pdf'
  })
  @IsOptional()
  @IsString({ message: 'Tax document must be a string' })
  @IsUrl({}, { message: 'Tax document must be a valid URL' })
  @MaxLength(500, { message: 'Tax document URL must not exceed 500 characters' })
  taxDocument?: string;

  @ApiProperty({ 
    description: 'Identity document URL or file path',
    example: 'https://example.com/id-document.pdf'
  })
  @IsOptional()
  @IsString({ message: 'Identity document must be a string' })
  @IsUrl({}, { message: 'Identity document must be a valid URL' })
  @MaxLength(500, { message: 'Identity document URL must not exceed 500 characters' })
  identityDocument?: string;

  @ApiProperty({ 
    description: 'Bank statement URL or file path',
    example: 'https://example.com/bank-statement.pdf'
  })
  @IsOptional()
  @IsString({ message: 'Bank statement must be a string' })
  @IsUrl({}, { message: 'Bank statement must be a valid URL' })
  @MaxLength(500, { message: 'Bank statement URL must not exceed 500 characters' })
  bankStatement?: string;

  @ApiPropertyOptional({ 
    description: 'Additional documents as JSON array of URLs',
    example: '["https://example.com/doc1.pdf", "https://example.com/doc2.pdf"]'
  })
  @IsOptional()
  @IsString({ message: 'Additional documents must be a JSON string' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          throw new Error('Must be an array');
        }
        return value;
      } catch {
        throw new Error('Invalid JSON format');
      }
    }
    return value;
  })
  additionalDocs?: string;
}

export class VerificationStatusResponseDto {
  @ApiProperty({ 
    description: 'Verification ID',
    example: 'clx1234567890'
  })
  id: string;

  @ApiProperty({ 
    description: 'Verification status',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'PENDING'
  })
  status: string;

  @ApiPropertyOptional({ 
    description: 'Rejection reason if status is REJECTED',
    example: 'Incomplete documentation'
  })
  rejectionReason?: string;

  @ApiProperty({ 
    description: 'Date when verification was submitted',
    example: '2024-01-01T00:00:00.000Z'
  })
  submittedAt: Date;

  @ApiPropertyOptional({ 
    description: 'Date when verification was reviewed',
    example: '2024-01-02T00:00:00.000Z'
  })
  reviewedAt?: Date;

  @ApiPropertyOptional({ 
    description: 'ID of admin who reviewed the verification',
    example: 'clx1234567890'
  })
  reviewedBy?: string;
}

export class ApproveVerificationDto {
  @ApiPropertyOptional({ 
    description: 'Optional notes for approval',
    example: 'All documents verified successfully'
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;
}

export class RejectVerificationDto {
  @ApiProperty({ 
    description: 'Reason for rejection',
    example: 'Incomplete business license documentation'
  })
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString({ message: 'Rejection reason must be a string' })
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Rejection reason must not exceed 500 characters' })
  reason: string;
}

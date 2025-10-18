import { IsOptional, IsString, MaxLength, IsDateString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ 
    description: 'User full name',
    example: 'John Doe',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ 
    description: 'User phone number',
    example: '+1234567890',
    maxLength: 20
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg'
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({ 
    description: 'User address',
    example: '123 Main St, City, State 12345',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Date of birth',
    example: '1990-01-01'
  })
  @IsOptional()
  @IsDateString()
  dob?: string;
}

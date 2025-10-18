import { IsEmail, IsString, IsOptional, IsEnum, IsDateString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserWithRoleDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  fullName: string;

  @ApiProperty({ 
    enum: Role, 
    example: Role.VENDOR, 
    description: 'User role' 
  })
  @IsEnum(Role, { message: 'Please provide a valid role' })
  role: Role;

  @ApiPropertyOptional({ example: '+1234567890', description: 'User phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'User avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '123 Main St, City, State', description: 'User address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1990-01-01', description: 'User date of birth' })
  @IsOptional()
  @IsDateString()
  dob?: Date;

  @ApiPropertyOptional({ 
    example: 'vendor-id-123', 
    description: 'Vendor ID for vendor-created users' 
  })
  @IsOptional()
  @IsUUID()
  createdByVendorId?: string;
}

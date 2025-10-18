import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class User {
  @ApiProperty({ description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'User full name' })
  fullName: string;

  @ApiProperty({ description: 'User phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  avatar?: string;

  @ApiProperty({ description: 'User address', required: false })
  address?: string;

  @ApiProperty({ description: 'User date of birth', required: false })
  dob?: Date;

  @ApiProperty({ description: 'User role' })
  role: string;

  @ApiProperty({ description: 'User status' })
  isActive: boolean;

  @ApiProperty({ description: 'Email verification status' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'User last login timestamp', required: false })
  lastLogin?: Date;

  @ApiProperty({ description: 'User creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'User last update date' })
  updatedAt: Date;

  // Hide sensitive fields from API responses
  password?: string;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

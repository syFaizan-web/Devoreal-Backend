import { IsEmail, IsString, IsOptional, IsEnum, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ description: 'User password', minLength: 8 })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ description: 'User full name' })
  @IsString({ message: 'Full name must be a string' })
  fullName: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  avatar?: string;

  @ApiPropertyOptional({ 
    description: 'User role', 
    enum: Role, 
    default: Role.USER 
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be one of: SUPER_ADMIN, ADMIN, MANAGER, VENDOR, USER' })
  role?: Role = Role.USER;

  @ApiPropertyOptional({ 
    description: 'Whether the user is active', 
    default: true 
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean = true;
}

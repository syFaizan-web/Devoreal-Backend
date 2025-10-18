import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class AssignRoleDto {
  @ApiProperty({ 
    enum: Role, 
    example: Role.MANAGER, 
    description: 'Role to assign' 
  })
  @IsEnum(Role, { message: 'Please provide a valid role' })
  role: Role;

  @ApiPropertyOptional({ 
    example: 'vendor-id-123', 
    description: 'Vendor ID for scoped roles' 
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ 
    example: 'category-id-123', 
    description: 'Category ID for scoped roles' 
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ 
    enum: Role, 
    example: Role.ADMIN, 
    description: 'New role to assign' 
  })
  @IsEnum(Role, { message: 'Please provide a valid role' })
  role: Role;

  @ApiPropertyOptional({ 
    example: 'vendor-id-123', 
    description: 'Vendor ID for scoped roles' 
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ 
    example: 'category-id-123', 
    description: 'Category ID for scoped roles' 
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class RoleCreationRulesDto {
  @ApiProperty({ 
    enum: Role, 
    example: Role.VENDOR, 
    description: 'Creator role' 
  })
  creatorRole: Role;

  @ApiProperty({ 
    type: [String], 
    example: [Role.ADMIN, Role.MANAGER], 
    description: 'Allowed roles to create' 
  })
  allowedRoles: Role[];

  @ApiProperty({ 
    example: 'OWN', 
    description: 'Scope of the creator role' 
  })
  scope: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the creator can create users' 
  })
  canCreateUsers: boolean;
}

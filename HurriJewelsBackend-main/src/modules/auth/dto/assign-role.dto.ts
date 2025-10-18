import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class AssignRoleDto {
  @ApiProperty({ 
    description: 'User ID to assign role to',
    example: 'clx1234567890abcdef'
  })
  @IsString()
  userId: string;

  @ApiProperty({ 
    description: 'Role to assign',
    enum: Role,
    example: Role.VENDOR
  })
  @IsEnum(Role)
  role: Role;
}

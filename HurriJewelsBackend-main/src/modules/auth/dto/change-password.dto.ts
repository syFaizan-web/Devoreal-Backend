import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Current password',
    example: 'currentPassword123'
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password',
    example: 'newSecurePassword123',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

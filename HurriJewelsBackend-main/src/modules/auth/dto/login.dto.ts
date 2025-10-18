import { IsEmail, IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail(
    { 
      allow_display_name: false,
      require_display_name: false,
      allow_utf8_local_part: true,
      require_tld: true
    }, 
    { message: 'Please provide a valid email address' }
  )
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(254, { message: 'Email must not exceed 254 characters' })
  email: string;

  @ApiProperty({ 
    description: 'User password',
    minLength: 8,
    maxLength: 128,
    example: 'SecurePass123!'
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)' 
    }
  )
  password: string;
}

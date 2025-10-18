import { 
  IsEmail, 
  IsString, 
  MinLength, 
  MaxLength, 
  IsOptional, 
  IsEnum, 
  IsNotEmpty,
  Matches,
  Length,
  Validate
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';
import { 
  IsStrongPassword, 
  IsValidName, 
  IsValidEmailDomain,
  PasswordsMatch
} from '../validators/custom-validators';

export class RegisterDto {
  @ApiProperty({ 
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString({ message: 'Full name must be a string' })
  @IsValidName({ message: 'Full name must contain only letters, spaces, hyphens, and apostrophes. Must be 2-100 characters long and start/end with a letter.' })
  @Transform(({ value }) => value?.trim())
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters long' })
  fullName: string;

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
  @IsValidEmailDomain({ message: 'Please use a valid email address from a trusted domain' })
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
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/,
    { 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    }
  )
  @IsStrongPassword({ message: 'Password is too weak. Please choose a stronger password that is not commonly used.' })
  password: string;

  @ApiProperty({ 
    description: 'Confirm password - must match the password field',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 128
  })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString({ message: 'Confirm password must be a string' })
  @MinLength(8, { message: 'Confirm password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Confirm password must not exceed 128 characters' })
  @PasswordsMatch({ message: 'Passwords do not match' })
  confirmPassword: string;



  @ApiPropertyOptional({ 
    description: 'User role', 
    enum: Role, 
    default: Role.USER,
    example: Role.USER
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be one of: SUPER_ADMIN, ADMIN, MANAGER, VENDOR, USER' })
  @Transform(({ value }) => value || Role.USER)
  role?: Role;
}

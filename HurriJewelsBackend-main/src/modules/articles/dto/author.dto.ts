import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateAuthorDto {
  @ApiProperty({ description: 'Author display name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ description: 'Author bio', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({ description: 'Author experience description', required: false, example: 'Expert jewelry consultant with over 10 years of experience in the luxury jewelry industry.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  experience?: string;

  @ApiProperty({ description: 'Author avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ description: 'Linked user ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class UpdateAuthorDto {
  @ApiProperty({ description: 'Author display name', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ description: 'Author bio', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({ description: 'Author experience description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  experience?: string;

  @ApiProperty({ description: 'Author avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ description: 'Linked user ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}


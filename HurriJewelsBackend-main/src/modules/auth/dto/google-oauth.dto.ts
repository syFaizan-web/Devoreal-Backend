import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleOAuthDto {
  @ApiProperty({ description: 'Google ID token received from frontend', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6I...' })
  @IsString()
  token: string;
}



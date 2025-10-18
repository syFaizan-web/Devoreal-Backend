import { ApiProperty } from '@nestjs/swagger';

export class AuthResponse {
  @ApiProperty({ description: 'Access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token type' })
  tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

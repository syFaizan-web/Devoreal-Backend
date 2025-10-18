import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FacebookOAuthDto {
  @ApiProperty({ description: 'Facebook access token received from frontend', example: 'EAAG...' })
  @IsString()
  token: string;
}



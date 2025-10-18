import { ApiProperty } from '@nestjs/swagger';

export class SessionDto {
  @ApiProperty({ 
    description: 'Session ID',
    example: 'clx1234567890abcdef'
  })
  id: string;

  @ApiProperty({ 
    description: 'Device/user agent information',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  userAgent: string;

  @ApiProperty({ 
    description: 'IP address of the session',
    example: '192.168.1.100'
  })
  ipAddress: string;

  @ApiProperty({ 
    description: 'Session creation timestamp',
    example: '2025-08-29T18:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Last activity timestamp',
    example: '2025-08-29T18:30:00.000Z'
  })
  lastActivity: Date;

  @ApiProperty({ 
    description: 'Whether the session is active',
    example: true
  })
  isActive: boolean;
}

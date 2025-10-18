import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Total number of payments' })
  totalPayments: number;

  @ApiProperty({ description: 'Total number of products' })
  totalProducts: number;

  @ApiProperty({ description: 'Total number of vendors' })
  totalVendors: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total pending orders' })
  totalPendingOrders: number;

  @ApiProperty({ description: 'Total active users' })
  totalActiveUsers: number;
}

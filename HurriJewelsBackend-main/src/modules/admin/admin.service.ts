import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AdminStatsDto } from './dto/admin-stats.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(): Promise<AdminStatsDto> {
    try {
      const [
        totalUsers,
        totalOrders,
        totalPayments,
        totalProducts,
        totalVendors,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.payment.count(),
        this.prisma.product.count(),
        this.prisma.vendorProfile.count(),
      ]);

      return {
        totalUsers,
        totalOrders,
        totalPayments,
        totalProducts,
        totalVendors,
        totalRevenue: 0, // Placeholder
        totalPendingOrders: 0, // Placeholder
        totalActiveUsers: 0, // Placeholder
      };
    } catch (error) {
      this.logger.error('Error getting dashboard stats:', error);
      throw new InternalServerErrorException('Failed to get dashboard stats: ' + error.message);
    }
  }

  async getUserStats() {
    try {
      const totalUsers = await this.prisma.user.count();
      const activeUsers = await this.prisma.user.count({
        where: { isActive: true },
      });
      const verifiedUsers = await this.prisma.user.count({
        where: { isEmailVerified: true },
      });

      return {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
      };
    } catch (error) {
      this.logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getOrderStats() {
    try {
      const totalOrders = await this.prisma.order.count();
      const pendingOrders = await this.prisma.order.count({
        where: { status: 'PENDING' },
      });
      const completedOrders = await this.prisma.order.count({
        where: { status: 'DELIVERED' },
      });

      return {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        processing: totalOrders - pendingOrders - completedOrders,
      };
    } catch (error) {
      this.logger.error('Error getting order stats:', error);
      throw error;
    }
  }

  async getPaymentStats() {
    try {
      const totalPayments = await this.prisma.payment.count();
      const completedPayments = await this.prisma.payment.count({
        where: { status: 'COMPLETED' },
      });
      const pendingPayments = await this.prisma.payment.count({
        where: { status: 'PENDING' },
      });

      return {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        failed: totalPayments - completedPayments - pendingPayments,
      };
    } catch (error) {
      this.logger.error('Error getting payment stats:', error);
      throw error;
    }
  }

  async getProductStats() {
    try {
      const totalProducts = await this.prisma.product.count();
      
      // For the new Product model, we don't have isActive/stockQuantity directly
      // We'll need to check through the child tables or use a different approach
      const activeProducts = await this.prisma.product.count(); // All products are considered active in new structure
      
      // Check low stock through inventory table
      const lowStockProducts = await this.prisma.productInventory.count({
        where: {
          inventoryQuantity: {
            not: null,
          },
        },
      });

      return {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        outOfStock: 0, // New structure doesn't have direct stock tracking
      };
    } catch (error) {
      this.logger.error('Error getting product stats:', error);
      throw error;
    }
  }

  async getVendorStats() {
    try {
      const totalVendors = await this.prisma.vendorProfile.count();
      const verifiedVendors = await this.prisma.vendorProfile.count({
        where: { isVerified: true },
      });
      const activeVendors = await this.prisma.vendorProfile.count({
        where: { isActive: true },
      });

      return {
        total: totalVendors,
        verified: verifiedVendors,
        active: activeVendors,
        unverified: totalVendors - verifiedVendors,
      };
    } catch (error) {
      this.logger.error('Error getting vendor stats:', error);
      throw error;
    }
  }

  async getRecentActivity(limit: number = 10) {
    try {
      const recentOrders = await this.prisma.order.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      const recentPayments = await this.prisma.payment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      return {
        orders: recentOrders,
        payments: recentPayments,
      };
    } catch (error) {
      this.logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  async getSystemHealth() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error checking system health:', error);
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getAuditLogs(limit: number = 50, offset: number = 0) {
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = await this.prisma.auditLog.count();

      return {
        logs: auditLogs,
        total: totalCount,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error('Error getting audit logs:', error);
      throw error;
    }
  }
}

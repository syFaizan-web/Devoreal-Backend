import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface AuditLogData {
  entity: string;
  entityId: string;
  action: string;
  userId?: string;
  meta?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entity: data.entity,
          entityId: data.entityId,
          action: data.action,
          userId: data.userId,
          meta: data.meta ? JSON.stringify(data.meta) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      this.logger.log('Audit log created', {
        entity: data.entity,
        entityId: data.entityId,
        action: data.action,
        userId: data.userId,
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error.stack, data);
    }
  }

  async getAuditLogs(
    entity?: string,
    entityId?: string,
    userId?: string,
    action?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const where: any = {
        isActive: true,
        isDeleted: false,
      };

      if (entity) where.entity = entity;
      if (entityId) where.entityId = entityId;
      if (userId) where.userId = userId;
      if (action) where.action = action;

        const [logs, total] = await Promise.all([
          this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          this.prisma.auditLog.count({ where }),
        ]);

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Failed to fetch audit logs', error.stack);
      throw error;
    }
  }
}

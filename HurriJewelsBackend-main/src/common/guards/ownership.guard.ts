import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { Role } from '../enums/role.enum';
import { OWNERSHIP_KEY, OwnershipConfig } from '../decorators/ownership.decorator';

@Injectable()
export class OwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OwnershipGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownershipConfig = this.reflector.getAllAndOverride<OwnershipConfig>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!ownershipConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request for ownership check');
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as Role;
    const entityId = this.extractEntityId(request, ownershipConfig.entity);

    if (!entityId) {
      this.logger.warn('No entity ID found in request', {
        userId: user.id,
        entity: ownershipConfig.entity,
        url: request.url,
      });
      throw new NotFoundException('Resource not found');
    }

    // Super Admin and Admin have global access
    if (userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN) {
      this.logger.debug('Global access granted', {
        userId: user.id,
        userRole,
        entity: ownershipConfig.entity,
        entityId,
      });
      return true;
    }

    // Check ownership based on entity type
    const hasOwnership = await this.checkOwnership(user, entityId, ownershipConfig);

    if (!hasOwnership) {
      this.logger.warn('Ownership check failed', {
        userId: user.id,
        userRole,
        entity: ownershipConfig.entity,
        entityId,
        url: request.url,
      });
      throw new ForbiddenException('Access denied: You can only manage your own resources');
    }

    this.logger.debug('Ownership check passed', {
      userId: user.id,
      userRole,
      entity: ownershipConfig.entity,
      entityId,
    });

    return true;
  }

  private extractEntityId(request: any, entity: string): string | null {
    // Try to get ID from route parameters first
    if (request.params?.id) {
      return request.params.id;
    }

    // Try to get ID from body for create/update operations
    if (request.body?.id) {
      return request.body.id;
    }

    // For specific entities, try different field names
    switch (entity) {
      case 'product':
        return request.params?.productId || request.body?.productId;
      case 'vendor':
        return request.params?.vendorId || request.body?.vendorId;
      case 'user':
        return request.params?.userId || request.body?.userId;
      default:
        return null;
    }
  }

  private async checkOwnership(user: any, entityId: string, config: OwnershipConfig): Promise<boolean> {
    try {
      const userId = user.id;
      const userRole = user.role as Role;

      switch (config.entity) {
        case 'product':
          return await this.checkProductOwnership(userId, userRole, entityId);
        case 'vendor':
          return await this.checkVendorOwnership(userId, userRole, entityId);
        case 'user':
          return await this.checkUserOwnership(userId, userRole, entityId);
        case 'category':
          return await this.checkCategoryOwnership(userId, userRole, entityId);
        default:
          this.logger.warn('Unknown entity type for ownership check', { entity: config.entity });
          return false;
      }
    } catch (error) {
      this.logger.error('Error checking ownership', error.stack, {
        userId: user.id,
        entityId,
        entity: config.entity,
      });
      return false;
    }
  }

  private async checkProductOwnership(userId: string, userRole: Role, productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!product) {
      return false;
    }

    // Vendor can manage their own products
    if (userRole === Role.VENDOR) {
      return product.vendor.userId === userId;
    }

    // Manager can manage products of their assigned vendor
    if (userRole === Role.MANAGER) {
      // TODO: Implement manager-vendor assignment logic
      // For now, return false as placeholder
      return false;
    }

    return false;
  }

  private async checkVendorOwnership(userId: string, userRole: Role, vendorId: string): Promise<boolean> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { userId: true },
    });

    if (!vendor) {
      return false;
    }

    // Vendor can manage their own profile
    if (userRole === Role.VENDOR) {
      return vendor.userId === userId;
    }

    // Manager can manage their assigned vendor
    if (userRole === Role.MANAGER) {
      // TODO: Implement manager-vendor assignment logic
      return false;
    }

    return false;
  }

  private async checkUserOwnership(userId: string, userRole: Role, targetUserId: string): Promise<boolean> {
    // Users can manage their own profile
    if (userId === targetUserId) {
      return true;
    }

    // Vendor can manage users they created
    if (userRole === Role.VENDOR) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { createdBy: true },
      });

      return targetUser?.createdBy === userId;
    }

    // Manager can manage users in their scope
    if (userRole === Role.MANAGER) {
      // TODO: Implement manager scope logic
      return false;
    }

    return false;
  }

  private async checkCategoryOwnership(userId: string, userRole: Role, categoryId: string): Promise<boolean> {
    // Categories are global resources, only admins can manage them
    return userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN;
  }
}

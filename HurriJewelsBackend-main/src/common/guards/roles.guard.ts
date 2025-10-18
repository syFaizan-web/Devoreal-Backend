import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLE_HIERARCHY } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request for role check');
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as Role;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;

    // Check if user has any of the required roles or higher level
    const hasRequiredRole = requiredRoles.some(role => {
      const requiredRoleLevel = ROLE_HIERARCHY[role] || 0;
      return userRoleLevel >= requiredRoleLevel;
    });

    if (!hasRequiredRole) {
      this.logger.warn('Insufficient role permissions', {
        userId: user.id,
        userRole,
        requiredRoles,
        url: request.url,
        method: request.method,
      });
      throw new ForbiddenException('Insufficient role permissions');
    }

    this.logger.debug('Role check passed', {
      userId: user.id,
      userRole,
      requiredRoles,
    });

    return true;
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check for admin role (case insensitive)
    if (user.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Admin access required. Only administrators can perform this action.');
    }

    return true;
  }
}

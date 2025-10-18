import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class VendorVerifiedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has vendor role
    if (user.role !== 'VENDOR') {
      throw new ForbiddenException('Access denied. Vendor role required.');
    }

    // Check if user has vendor profile
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      include: { verification: true }
    });

    if (!vendorProfile) {
      throw new ForbiddenException('Vendor profile not found. Please create a vendor profile first.');
    }

    // Check if vendor is verified
    if (!vendorProfile.isVerified || !vendorProfile.verification || vendorProfile.verification.status !== 'APPROVED') {
      throw new ForbiddenException('Vendor must be verified before accessing this resource.');
    }

    // Add vendor profile to request for use in controllers
    request.vendorProfile = vendorProfile;

    return true;
  }
}

@Injectable()
export class VendorRoleGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has vendor role
    if (user.role !== 'VENDOR') {
      throw new ForbiddenException('Access denied. Vendor role required.');
    }

    // Check if user has vendor profile
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      include: { verification: true }
    });

    if (!vendorProfile) {
      throw new ForbiddenException('Vendor profile not found. Please create a vendor profile first.');
    }

    // Add vendor profile to request for use in controllers
    request.vendorProfile = vendorProfile;

    return true;
  }
}

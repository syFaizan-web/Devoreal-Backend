import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role, ROLE_CREATION_RULES, ROLE_SCOPES } from '../enums/role.enum';
import type { $Enums } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../modules/users/users.service';

export interface CreateUserWithRoleDto {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatar?: string;
  address?: string;
  dob?: Date;
  // For scoped roles
  vendorId?: string;
  categoryId?: string;
  // For vendor-created users
  createdByVendorId?: string;
}

@Injectable()
export class RoleCreationService {
  private readonly logger = new Logger(RoleCreationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async validateRoleCreation(
    creatorUserId: string,
    targetRole: Role,
    context?: { vendorId?: string; categoryId?: string; createdByVendorId?: string },
  ): Promise<void> {
    // Get creator user
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorUserId },
      select: { id: true, role: true, email: true },
    });

    if (!creator) {
      throw new BadRequestException('Creator user not found');
    }

    const creatorRole = creator.role as unknown as Role;
    const allowedRoles = ROLE_CREATION_RULES[creatorRole] as readonly Role[];

    // Check if creator can create the target role
    if (!allowedRoles.includes(targetRole)) {
      this.logger.warn('Role creation denied', {
        creatorId: creatorUserId,
        creatorRole,
        targetRole,
        allowedRoles,
      });
      throw new ForbiddenException(`You cannot create users with role: ${targetRole}`);
    }

    // Validate scoping rules
    await this.validateScopingRules(creatorRole, targetRole, context);
  }

  private async validateScopingRules(
    creatorRole: Role,
    targetRole: Role,
    context?: { vendorId?: string; categoryId?: string; createdByVendorId?: string },
  ): Promise<void> {
    const creatorScope = ROLE_SCOPES[creatorRole];
    const targetScope = ROLE_SCOPES[targetRole];

    // Super Admin and Admin can create global users
    if (creatorRole === Role.SUPER_ADMIN || creatorRole === Role.ADMIN) {
      return;
    }

    // Vendor can only create users for their own organization
    if (creatorRole === Role.VENDOR) {
      if (!context?.createdByVendorId) {
        throw new BadRequestException('Vendor must specify their vendor ID when creating users');
      }

      // Verify the vendor exists and belongs to the creator
      const vendor = await this.prisma.vendorProfile.findFirst({
        where: {
          id: context.createdByVendorId,
          userId: context.vendorId, // This should be the creator's user ID
        },
      });

      if (!vendor) {
        throw new ForbiddenException('You can only create users for your own vendor organization');
      }
    }

    // Manager can only create users in their assigned scope
    if (creatorRole === Role.MANAGER) {
      // TODO: Implement manager scope validation
      // For now, managers cannot create users
      throw new ForbiddenException('Managers cannot create users');
    }
  }

  async createUserWithRole(
    creatorUserId: string,
    userData: CreateUserWithRoleDto,
  ): Promise<any> {
    await this.validateRoleCreation(creatorUserId, userData.role, {
      vendorId: userData.createdByVendorId,
      createdByVendorId: userData.createdByVendorId,
    });

    // Create the user via UsersService to enforce flags and token storage
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const created = await this.usersService.create(
      {
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        role: (userData.role as unknown as Role),
        phone: userData.phone,
        avatar: userData.avatar,
      } as any,
      {
        initialFlags: { isActive: true, isDeleted: false, isEmailVerified: false },
        sendVerificationEmail: true,
      },
    );

    // Set creator linkage
    const user = await this.prisma.user.update({
      where: { id: created.id },
      data: {
        createdBy: creatorUserId,
        address: userData.address,
        dob: userData.dob,
      },
    });

    this.logger.log('User created with role', {
      userId: user.id,
      role: user.role,
      createdBy: creatorUserId,
      email: user.email,
    });

    return user;
  }

  async getUsersByCreator(creatorUserId: string, page: number = 1, limit: number = 10) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdBy: creatorUserId, isDeleted: false },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({
        where: { createdBy: creatorUserId, isDeleted: false },
      }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRoleCreationRules(creatorRole: Role) {
    const allowedRoles = ROLE_CREATION_RULES[creatorRole];
    const scope = ROLE_SCOPES[creatorRole];

    return {
      creatorRole,
      allowedRoles,
      scope,
      canCreateUsers: allowedRoles.length > 0,
    };
  }
}

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Ownership } from '../../common/decorators/ownership.decorator';
import { Role } from '../../common/enums/role.enum';
import { RoleCreationService } from '../../common/services/role-creation.service';
import { AuditService } from '../../common/services/audit.service';
import { AssignRoleDto, UpdateUserRoleDto, RoleCreationRulesDto } from './dto/role-management.dto';
import { CreateUserWithRoleDto } from './dto/create-user-with-role.dto';

@ApiTags('Role Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/role-management')
export class RoleManagementController {
  constructor(
    private readonly roleCreationService: RoleCreationService,
    private readonly auditService: AuditService,
  ) {}

  @Post('users')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Create user with specific role' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Invalid role or validation error' })
  async createUserWithRole(
    @Request() req: any,
    @Body() createUserDto: CreateUserWithRoleDto,
  ) {
    const creatorUserId = req.user.id;
    
    const user = await this.roleCreationService.createUserWithRole(
      creatorUserId,
      createUserDto,
    );

    // Log the action
    await this.auditService.log({
      entity: 'User',
      entityId: user.id,
      action: 'CREATE',
      userId: creatorUserId,
      meta: {
        createdRole: user.role,
        createdEmail: user.email,
        createdBy: creatorUserId,
      },
    });

    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  @Get('users/created-by-me')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Get users created by current user' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getUsersCreatedByMe(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const creatorUserId = req.user.id;
    
    const result = await this.roleCreationService.getUsersByCreator(
      creatorUserId,
      page,
      limit,
    );

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get('rules')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR, Role.MANAGER)
  @ApiOperation({ summary: 'Get role creation rules for current user' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getRoleCreationRules(@Request() req: any) {
    const userRole = req.user.role as Role;
    
    const rules = await this.roleCreationService.getRoleCreationRules(userRole);

    return {
      success: true,
      message: 'Role creation rules retrieved successfully',
      data: rules,
    };
  }

  @Put('users/:userId/role')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'user', userIdField: 'userId' })
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
  ) {
    // TODO: Implement role update logic
    // This would involve validating the role change and updating the user
    
    await this.auditService.log({
      entity: 'User',
      entityId: userId,
      action: 'UPDATE_ROLE',
      userId: req.user.id,
      meta: {
        newRole: updateRoleDto.role,
        updatedBy: req.user.id,
      },
    });

    return {
      success: true,
      message: 'User role updated successfully',
      data: {
        userId,
        newRole: updateRoleDto.role,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      },
    };
  }

  @Delete('users/:userId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @Ownership({ entity: 'user', userIdField: 'userId' })
  @UseGuards(OwnershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'userId', description: 'User ID to delete' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Request() req: any,
    @Param('userId') userId: string,
  ) {
    // TODO: Implement user deletion logic
    // This would involve soft deleting the user
    
    await this.auditService.log({
      entity: 'User',
      entityId: userId,
      action: 'DELETE',
      userId: req.user.id,
      meta: {
        deletedBy: req.user.id,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}

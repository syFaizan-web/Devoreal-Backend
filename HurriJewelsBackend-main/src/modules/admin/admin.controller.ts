import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthService } from '../auth/auth.service';
import { AssignRoleDto } from '../auth/dto/assign-role.dto';
import { JwtBlacklistGuard } from '../auth/guards/jwt-blacklist.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ValidationErrorInterceptor } from '../../common/validators/validation-error.interceptor';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtBlacklistGuard, RolesGuard)
@UseInterceptors(ValidationErrorInterceptor)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  @Get('dashboard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getDashboardStats(@Request() req) {
    return this.adminService.getDashboardStats();
  }

  @Post('assign-role')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user (admin only)' })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role assigned successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async assignRole(@Body() assignRoleDto: AssignRoleDto): Promise<{ message: string }> {
    await this.authService.assignRole(assignRoleDto.userId, assignRoleDto.role);
    return { message: 'Role assigned successfully' };
  }

  @Get('roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get roles assigned to logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'User roles retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token invalid or revoked',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getRoles(@Request() req): Promise<{ roles: string[] }> {
    return this.authService.getRoles(req.user.sub);
  }
}

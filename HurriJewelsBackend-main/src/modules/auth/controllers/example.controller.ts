import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('example')
@Controller('example')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExampleController {
  
  @Get('public')
  @ApiOperation({ summary: 'Public endpoint - any authenticated user' })
  getPublicData() {
    return { message: 'This is public data for any authenticated user' };
  }

  @Get('user-only')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'User only endpoint' })
  getCustomerData() {
    return { message: 'This data is only for users' };
  }

  @Get('vendor-only')
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Vendor only endpoint' })
  getVendorData() {
    return { message: 'This data is only for vendors' };
  }

  @Get('admin-only')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin only endpoint' })
  getAdminData() {
    return { message: 'This data is only for admins' };
  }

  @Get('admin-or-vendor')
  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Admin or Vendor endpoint' })
  getAdminOrVendorData() {
    return { message: 'This data is for admins or vendors' };
  }

  @Post('admin-action')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin action endpoint' })
  performAdminAction() {
    return { message: 'Admin action performed successfully' };
  }
}

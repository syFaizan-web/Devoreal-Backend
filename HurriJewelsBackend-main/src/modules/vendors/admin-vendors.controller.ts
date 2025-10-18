import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
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
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { ApproveVerificationDto, RejectVerificationDto } from './dto/vendor-verification.dto';
import { VendorListQueryDto, VendorListResponseDto, VendorDetailDto } from './dto/admin-vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ValidationErrorInterceptor } from '../../common/validators/validation-error.interceptor';

@ApiTags('admin')
@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ValidationErrorInterceptor)
@ApiBearerAuth()
@ApiSecurity('bearer')
export class AdminVendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all vendors with pagination and filters',
    description: 'Retrieve a paginated list of all vendors with optional filtering and sorting. Only admins can access this endpoint.'
  })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'Filter by verification status' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by vendor active status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by business name or email' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order', example: 'desc' })
  @ApiResponse({
    status: 200,
    description: 'Vendors retrieved successfully',
    type: VendorListResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Admin role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid or expired token' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  async getAllVendors(@Query() query: VendorListQueryDto) {
    return this.vendorsService.getAllVendors(query);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get vendor details by ID',
    description: 'Retrieve detailed information about a specific vendor including verification status and stores. Only admins can access this endpoint.'
  })
  @ApiParam({
    name: 'id',
    description: 'Vendor ID',
    example: 'clx1234567890'
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor details retrieved successfully',
    type: VendorDetailDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Admin role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Vendor not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor not found.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async getVendorById(@Param('id') vendorId: string) {
    return this.vendorsService.getVendorById(vendorId);
  }

  @Put(':id/approve')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve vendor verification',
    description: 'Approve a pending vendor verification request. Only admins can access this endpoint.'
  })
  @ApiParam({
    name: 'id',
    description: 'Vendor ID',
    example: 'clx1234567890'
  })
  @ApiBody({ type: ApproveVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Vendor verification approved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Vendor verification approved successfully.' },
        vendorId: { type: 'string', example: 'clx1234567890' },
        status: { type: 'string', example: 'APPROVED' },
        reviewedAt: { type: 'string', format: 'date-time' },
        reviewedBy: { type: 'string', example: 'clx1234567890' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid verification status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Verification is already approved.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Admin role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Vendor or verification not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor not found.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async approveVendorVerification(
    @Request() req,
    @Param('id') vendorId: string,
    @Body() approveData: ApproveVerificationDto
  ) {
    return this.vendorsService.approveVendorVerification(vendorId, req.user.id, approveData.notes);
  }

  @Put(':id/reject')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject vendor verification',
    description: 'Reject a pending vendor verification request with a reason. Only admins can access this endpoint.'
  })
  @ApiParam({
    name: 'id',
    description: 'Vendor ID',
    example: 'clx1234567890'
  })
  @ApiBody({ type: RejectVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Vendor verification rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Vendor verification rejected.' },
        vendorId: { type: 'string', example: 'clx1234567890' },
        status: { type: 'string', example: 'REJECTED' },
        rejectionReason: { type: 'string', example: 'Incomplete documentation provided.' },
        reviewedAt: { type: 'string', format: 'date-time' },
        reviewedBy: { type: 'string', example: 'clx1234567890' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid verification status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Verification is already rejected.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Admin role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Vendor or verification not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor not found.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async rejectVendorVerification(
    @Request() req,
    @Param('id') vendorId: string,
    @Body() rejectData: RejectVerificationDto
  ) {
    return this.vendorsService.rejectVendorVerification(vendorId, req.user.id, rejectData.reason);
  }
}

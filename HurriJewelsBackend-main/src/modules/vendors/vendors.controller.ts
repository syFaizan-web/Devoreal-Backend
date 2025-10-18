import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { SubmitVerificationDto, VerificationStatusResponseDto } from './dto/vendor-verification.dto';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from './dto/store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VendorRoleGuard, VendorVerifiedGuard } from './guards/vendor-verified.guard';
import { ValidationErrorInterceptor } from '../../common/validators/validation-error.interceptor';

@ApiTags('vendor-operations')
@Controller('vendor')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ValidationErrorInterceptor)
@ApiBearerAuth()
@ApiSecurity('bearer')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('verify')
  @Roles('VENDOR')
  @UseGuards(VendorRoleGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit vendor verification documents',
    description: 'Submit verification documents to become a verified vendor. Only vendors can access this endpoint.'
  })
  @ApiBody({ type: SubmitVerificationDto })
  @ApiResponse({
    status: 201,
    description: 'Verification request submitted successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clx1234567890' },
        status: { type: 'string', example: 'PENDING' },
        submittedAt: { type: 'string', format: 'date-time' },
        message: { type: 'string', example: 'Verification request submitted successfully. It will be reviewed by our team.' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or verification already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Verification request is already pending review.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Vendor role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Vendor role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Vendor profile not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor profile not found. Please create a vendor profile first.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async submitVerification(
    @Request() req,
    @Body() verificationData: SubmitVerificationDto
  ) {
    return this.vendorsService.submitVerification(req.user.id, verificationData);
  }

  @Get('verification-status')
  @Roles('VENDOR')
  @UseGuards(VendorRoleGuard)
  @ApiOperation({
    summary: 'Get vendor verification status',
    description: 'Get the current verification status of the vendor. Only vendors can access this endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved successfully',
    type: VerificationStatusResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Vendor role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Vendor role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Vendor profile not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor profile not found.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async getVerificationStatus(@Request() req) {
    return this.vendorsService.getVerificationStatus(req.user.id);
  }

  @Post('store')
  @Roles('VENDOR')
  @UseGuards(VendorVerifiedGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new store',
    description: 'Create a new store for the verified vendor. Only verified vendors can access this endpoint.'
  })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({
    status: 201,
    description: 'Store created successfully',
    type: StoreResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or store slug already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Store slug already exists. Please choose a different slug.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Verified vendor required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Vendor must be verified before creating a store.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Vendor profile not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Vendor profile not found. Please create a vendor profile first.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async createStore(
    @Request() req,
    @Body() storeData: CreateStoreDto
  ) {
    return this.vendorsService.createStore(req.user.id, storeData);
  }

  @Get('store')
  @Roles('VENDOR')
  @UseGuards(VendorRoleGuard)
  @ApiOperation({
    summary: 'Get vendor store',
    description: 'Get the current vendor\'s store information. Only vendors can access this endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Store retrieved successfully',
    type: StoreResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Vendor role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied. Vendor role required.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'No store found for this vendor.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async getVendorStore(@Request() req) {
    return this.vendorsService.getVendorStore(req.user.id);
  }

  @Put('store/:id')
  @Roles('VENDOR')
  @UseGuards(VendorVerifiedGuard)
  @ApiOperation({
    summary: 'Update vendor store',
    description: 'Update the vendor\'s store details. Only verified vendors can access this endpoint.'
  })
  @ApiParam({
    name: 'id',
    description: 'Store ID',
    example: 'clx1234567890'
  })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({
    status: 200,
    description: 'Store updated successfully',
    type: StoreResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid JSON format for social media links.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Verified vendor required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Vendor must be verified before accessing this resource.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Store not found or does not belong to this vendor.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async updateStore(
    @Request() req,
    @Param('id') storeId: string,
    @Body() updateData: UpdateStoreDto
  ) {
    return this.vendorsService.updateStore(req.user.id, storeId, updateData);
  }

  @Delete('store/:id')
  @Roles('VENDOR')
  @UseGuards(VendorVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete vendor store',
    description: 'Soft delete the vendor\'s store. Only verified vendors can access this endpoint.'
  })
  @ApiParam({
    name: 'id',
    description: 'Store ID',
    example: 'clx1234567890'
  })
  @ApiResponse({
    status: 200,
    description: 'Store deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Store deleted successfully.' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Verified vendor required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Vendor must be verified before accessing this resource.' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Store not found or does not belong to this vendor.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async deleteStore(
    @Request() req,
    @Param('id') storeId: string
  ) {
    return this.vendorsService.deleteStore(req.user.id, storeId);
  }
}
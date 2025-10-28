import { Body, Controller, Get, Post, Patch, Delete, Param, Query, HttpCode, HttpStatus, BadRequestException, NotFoundException, Logger, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiBody, ApiParam, ApiConsumes, ApiProperty } from '@nestjs/swagger';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ShippingService } from './shipping.service';
import { CreateShipmentDto } from '@/modules/shipping/dto/create-shipment.dto';
import { UpdateShipmentDto } from '@/modules/shipping/dto/update-shipment.dto';
import { CreateShipmentItemDto } from '@/modules/shipping/dto/create-shipment-item.dto';
import { UpdateShipmentItemDto } from '@/modules/shipping/dto/update-shipment-item.dto';

@ApiTags('shipping')
@ApiBearerAuth('JWT-auth')
@Controller('shipping')
export class ShippingController {
  private readonly logger = new Logger(ShippingController.name);

  constructor(private readonly shippingService: ShippingService) {}

  @ApiOperation({ summary: 'Create a shipment for an order' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  @UseInterceptors(FileInterceptor('labelFile', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createShipment(@Body() dto: CreateShipmentDto, @UploadedFile() labelFile?: Express.Multer.File) {
    this.logger.log('Creating shipment', { orderId: dto.orderId, customerId: dto.customerId });
    try {
      const data = { ...dto };
      if (labelFile) {
        data.labelUrl = `/uploads/shipping/${labelFile.filename}`;
      }
      return await this.shippingService.createShipment(data);
    } catch (error) {
      this.logger.error('Create shipment failed', { error: error?.message });
      throw error instanceof BadRequestException ? error : new BadRequestException('Failed to create shipment');
    }
  }

  @ApiOperation({ summary: 'Get shipments list with filters and pagination' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 20 } })
  @Get()
  async listShipments(@Query('orderId') orderId?: string, @Query('customerId') customerId?: string, @Query('status') status?: string, @Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    const pageNum = Math.max(1, parseInt(page as any) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as any) || 20));
    this.logger.log('Listing shipments', { orderId, customerId, status, page: pageNum, limit: pageSize });
    return await this.shippingService.listShipments({ orderId, customerId, status, page: pageNum, limit: pageSize });
  }

  @ApiOperation({ summary: 'Get shipment by id' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @Get(':id')
  async getShipment(@Param('id') id: string) {
    const shipment = await this.shippingService.getShipmentById(id);
    if (!shipment) {
      this.logger.warn('Shipment not found', { id });
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  @ApiOperation({ summary: 'Update shipment' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @UseInterceptors(FileInterceptor('labelFile', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @Patch(':id')
  async updateShipment(@Param('id') id: string, @Body() dto: UpdateShipmentDto, @UploadedFile() labelFile?: Express.Multer.File) {
    this.logger.log('Updating shipment', { id });
    const data = { ...dto };
    if (labelFile) {
      data.labelUrl = `/uploads/shipping/${labelFile.filename}`;
    }
    return await this.shippingService.updateShipment(id, data);
  }

  @ApiOperation({ summary: 'Soft delete shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @Delete(':id')
  async deleteShipment(@Param('id') id: string) {
    this.logger.log('Soft deleting shipment', { id });
    return await this.shippingService.softDeleteShipment(id);
  }

  // Shipment Items

  @ApiOperation({ summary: 'Add item to a shipment' })
  @ApiParam({ name: 'shipmentId', description: 'Shipment ID' })
  @Post(':shipmentId/items')
  async addShipmentItem(@Param('shipmentId') shipmentId: string, @Body() dto: CreateShipmentItemDto) {
    this.logger.log('Adding shipment item', { shipmentId });
    return await this.shippingService.addShipmentItem(shipmentId, dto);
  }

  @ApiOperation({ summary: 'List items in a shipment' })
  @ApiParam({ name: 'shipmentId', description: 'Shipment ID' })
  @Get(':shipmentId/items')
  async listShipmentItems(@Param('shipmentId') shipmentId: string) {
    return await this.shippingService.listShipmentItems(shipmentId);
  }

  @ApiOperation({ summary: 'Update a shipment item' })
  @ApiParam({ name: 'shipmentId', description: 'Shipment ID' })
  @ApiParam({ name: 'itemId', description: 'Shipment Item ID' })
  @Patch(':shipmentId/items/:itemId')
  async updateShipmentItem(@Param('shipmentId') shipmentId: string, @Param('itemId') itemId: string, @Body() dto: UpdateShipmentItemDto) {
    this.logger.log('Updating shipment item', { shipmentId, itemId });
    return await this.shippingService.updateShipmentItem(shipmentId, itemId, dto);
  }

  @ApiOperation({ summary: 'Remove (soft delete) a shipment item' })
  @ApiParam({ name: 'shipmentId', description: 'Shipment ID' })
  @ApiParam({ name: 'itemId', description: 'Shipment Item ID' })
  @Delete(':shipmentId/items/:itemId')
  async removeShipmentItem(@Param('shipmentId') shipmentId: string, @Param('itemId') itemId: string) {
    this.logger.log('Soft deleting shipment item', { shipmentId, itemId });
    return await this.shippingService.softDeleteShipmentItem(shipmentId, itemId);
  }
}



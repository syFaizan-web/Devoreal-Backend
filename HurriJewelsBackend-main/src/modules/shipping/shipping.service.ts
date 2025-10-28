import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateShipmentDto } from '@/modules/shipping/dto/create-shipment.dto';
import { UpdateShipmentDto } from '@/modules/shipping/dto/update-shipment.dto';
import { CreateShipmentItemDto } from '@/modules/shipping/dto/create-shipment-item.dto';
import { UpdateShipmentItemDto } from '@/modules/shipping/dto/update-shipment-item.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createShipment(dto: CreateShipmentDto) {
    try {
      const created = await (this.prisma as any).shippingInfo.create({
        data: {
          orderId: dto.orderId,
          customerId: dto.customerId,
          sellerId: dto.sellerId,
          fulfillmentCenterId: dto.fulfillmentCenterId,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          landmark: dto.landmark,
          receiverName: dto.receiverName,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
          phone: dto.phone,
          email: dto.email,
          carrier: dto.carrier,
          trackingNumber: dto.trackingNumber,
          carrierService: dto.carrierService,
          externalCarrierId: dto.externalCarrierId,
          labelUrl: dto.labelUrl,
          proofOfDeliveryUrl: dto.proofOfDeliveryUrl,
          status: dto.status,
          method: dto.method,
          cost: dto.cost,
          currency: dto.currency,
          weight: dto.weight,
          weightUnit: dto.weightUnit,
          length: dto.length,
          width: dto.width,
          height: dto.height,
          packageType: dto.packageType,
          estimatedDelivery: dto.estimatedDelivery,
          shippedAt: dto.shippedAt,
          deliveredAt: dto.deliveredAt,
          attemptCount: dto.attemptCount,
          lastStatusUpdateAt: dto.lastStatusUpdateAt,
          createdBy: dto.createdBy,
          updatedBy: dto.updatedBy ?? dto.createdBy,
        } as any,
      });
      return created;
    } catch (error) {
      this.logger.error('Error creating shipment', { error: error?.message });
      throw new BadRequestException(error?.message ?? 'Failed to create shipment');
    }
  }

  async listShipments(params: { orderId?: string; customerId?: string; status?: string; page: number; limit: number; }) {
    const { orderId, customerId, status, page, limit } = params;
    const where: any = { isDeleted: false };
    if (orderId) where.orderId = orderId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status as any;

    const [items, total] = await this.prisma.$transaction([
      (this.prisma as any).shippingInfo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.prisma as any).shippingInfo.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getShipmentById(id: string) {
    return await (this.prisma as any).shippingInfo.findFirst({ where: { id, isDeleted: false }, include: { items: true } });
  }

  async updateShipment(id: string, dto: UpdateShipmentDto) {
    const exists = await (this.prisma as any).shippingInfo.findUnique({ where: { id } });
    if (!exists || exists.isDeleted) throw new NotFoundException('Shipment not found');
    try {
      const updated = await (this.prisma as any).shippingInfo.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: dto.updatedBy ?? exists.updatedBy,
          lastStatusUpdateAt: dto.status && dto.status !== (exists.status as any) ? new Date() : dto.lastStatusUpdateAt,
        } as any,
      });
      return updated;
    } catch (error) {
      this.logger.error('Error updating shipment', { id, error: error?.message });
      throw new BadRequestException(error?.message ?? 'Failed to update shipment');
    }
  }

  async softDeleteShipment(id: string) {
    const exists = await (this.prisma as any).shippingInfo.findUnique({ where: { id } });
    if (!exists || exists.isDeleted) throw new NotFoundException('Shipment not found');
    return await (this.prisma as any).shippingInfo.update({ where: { id }, data: { isDeleted: true, isActive: false, deletedAt: new Date() } });
  }

  // Items
  async addShipmentItem(shipmentId: string, dto: CreateShipmentItemDto) {
    const shipment = await (this.prisma as any).shippingInfo.findUnique({ where: { id: shipmentId } });
    if (!shipment || shipment.isDeleted) throw new NotFoundException('Shipment not found');
    return await (this.prisma as any).shipmentItem.create({
      data: {
        shipmentId,
        orderItemId: dto.orderItemId,
        productId: dto.productId,
        sku: dto.sku,
        quantity: dto.quantity,
        weight: dto.weight,
        description: dto.description,
        createdBy: dto.createdBy,
        updatedBy: dto.updatedBy ?? dto.createdBy,
      } as any,
    });
  }

  async listShipmentItems(shipmentId: string) {
    return await (this.prisma as any).shipmentItem.findMany({ where: { shipmentId, isDeleted: false }, orderBy: { createdAt: 'desc' } });
  }

  async updateShipmentItem(shipmentId: string, itemId: string, dto: UpdateShipmentItemDto) {
    const item = await (this.prisma as any).shipmentItem.findUnique({ where: { id: itemId } });
    if (!item || item.isDeleted || item.shipmentId !== shipmentId) throw new NotFoundException('Shipment item not found');
    return await (this.prisma as any).shipmentItem.update({ where: { id: itemId }, data: { ...dto } });
  }

  async softDeleteShipmentItem(shipmentId: string, itemId: string) {
    const item = await (this.prisma as any).shipmentItem.findUnique({ where: { id: itemId } });
    if (!item || item.isDeleted || item.shipmentId !== shipmentId) throw new NotFoundException('Shipment item not found');
    return await (this.prisma as any).shipmentItem.update({ where: { id: itemId }, data: { isDeleted: true, isActive: false, deletedAt: new Date() } });
  }
}



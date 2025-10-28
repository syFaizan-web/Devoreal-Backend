import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fulfillmentCenterId?: string;

  @ApiProperty()
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiverName?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierService?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalCarrierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labelUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proofOfDeliveryUrl?: string;

  @ApiProperty({ enum: ['PENDING','CONFIRMED','PROCESSING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED','CANCELLED'], default: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: any;

  @ApiProperty({ enum: ['STANDARD','EXPRESS','OVERNIGHT','SAME_DAY','ECONOMY','INTERNATIONAL','LOCAL_DELIVERY'], default: 'STANDARD' })
  @IsOptional()
  @IsString()
  method?: any;

  @ApiProperty()
  @IsNumber()
  cost: number;

  @ApiProperty({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ enum: ['KG','LB','OZ','G'], default: 'KG' })
  @IsOptional()
  @IsString()
  weightUnit?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  shippedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  attemptCount?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastStatusUpdateAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}



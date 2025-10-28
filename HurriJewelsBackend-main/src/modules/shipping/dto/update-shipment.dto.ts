import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShipmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sellerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fulfillmentCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() carrier?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackingNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() carrierService?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalCarrierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() labelUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proofOfDeliveryUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() height?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() packageType?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() estimatedDelivery?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() shippedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() deliveredAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attemptCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastStatusUpdateAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() updatedBy?: string;
}



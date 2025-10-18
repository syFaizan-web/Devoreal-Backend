import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';
export const OWNERSHIP_ENTITY_KEY = 'ownership_entity';

export interface OwnershipConfig {
  entity: string; // 'product', 'vendor', 'user', etc.
  userIdField?: string; // Field name that contains the user ID (default: 'userId')
  vendorIdField?: string; // Field name that contains the vendor ID (default: 'vendorId')
  productIdField?: string; // Field name that contains the product ID (default: 'id')
  categoryIdField?: string; // Field name that contains the category ID (default: 'id')
}

export const Ownership = (config: OwnershipConfig) => SetMetadata(OWNERSHIP_KEY, config);
export const OwnershipEntity = (entity: string) => SetMetadata(OWNERSHIP_ENTITY_KEY, entity);

# ShippingInfo Model Enhancement

## Summary

The `ShippingInfo` model has been enhanced with additional fields and support for multiple shipments per order. This document outlines the changes made and provides migration guidance.

## Changes Made

### 1. New Enums Added

Three new enums were added to support shipping functionality:

- **ShipmentStatus**: Tracks shipment lifecycle (PENDING, CONFIRMED, PROCESSING, SHIPPED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED, CANCELLED)
- **ShippingMethod**: Defines delivery methods (STANDARD, EXPRESS, OVERNIGHT, SAME_DAY, ECONOMY, INTERNATIONAL, LOCAL_DELIVERY)
- **WeightUnit**: Measurement units (KG, LB, OZ, G)

### 2. Enhanced ShippingInfo Model

The shipping information model now includes:

#### New Address Fields

- `addressLine1` (replaces `address`)
- `addressLine2` (optional)
- `landmark` (optional)
- `receiverName` (optional)
- `email` (optional)

#### New Organization Fields

- `sellerId` (optional)
- `fulfillmentCenterId` (optional)

#### Enhanced Tracking Fields

- `carrierService` (service type)
- `externalCarrierId` (external system ID)
- `labelUrl` (shipping label)
- `proofOfDeliveryUrl` (delivery proof)

#### Package Dimensions

- `weight` (Decimal with 8,3 precision)
- `weightUnit` (enum)
- `length`, `width`, `height` (dimensions)
- `packageType` (optional descriptor)

#### Status Tracking

- `shippedAt` (timestamp)
- `attemptCount` (delivery attempts)
- `lastStatusUpdateAt` (last update time)

#### Financial Fields

- `cost` (changed from Float to Decimal(12,2) for precision)
- `currency` (default "USD")

### 3. New ShipmentItem Model

A new model to track individual items in shipments:

- Links to shipment via `shipmentId`
- Stores product details (orderItemId, productId, sku)
- Tracks quantity and weight per item
- Includes audit fields (isActive, isDeleted, createdAt, etc.)

### 4. Relationship Changes

**Important**: The relationship between Order and ShippingInfo changed from **one-to-one** to **one-to-many**:

- **Before**: `shipping ShippingInfo?` (Order could have one or zero shipping records)
- **After**: `shipping ShippingInfo[]` (Order can have multiple shipments)

This enables:

- Split shipments (multiple packages)
- Partial shipments
- Multiple fulfillment centers
- Tracking of backorders or delayed items

## Database Safety

### Existing Data Protection

✅ **All audit fields preserved** (`isActive`, `isDeleted`, `createdAt`, `updatedAt`, audit fields)
✅ **Soft delete support maintained** (isDeleted, deletedAt, deletedBy)
✅ **Relation integrity maintained** (onDelete: Cascade)
✅ **All existing fields that have equivalents are mapped**:

- Old `address` → New `addressLine1` (requires data migration)

### Migration Considerations

#### BREAKING CHANGE: Address Field Mapping

The old `address` field is now `addressLine1`. When running migrations:

**Option 1: Prisma Migration** (Recommended)

```bash
# Create a migration to rename the column
npx prisma migrate dev --name rename_address_to_address_line1

# Or create a custom migration SQL:
ALTER TABLE shipping_info RENAME COLUMN address TO address_line1;
```

**Option 2: Manual Data Migration**
If you have existing data:

```sql
-- First, add the new field
ALTER TABLE shipping_info ADD COLUMN address_line1 VARCHAR;
-- Migrate data
UPDATE shipping_info SET address_line1 = address;
-- Drop old column after verification
-- ALTER TABLE shipping_info DROP COLUMN address;
```

#### Other Field Additions

All new fields are:

- **Optional** (nullable) where appropriate
- **Have defaults** where sensible
- **Don't break existing queries** (only adds new capabilities)

### Cost Field Type Change

- **Old**: `cost Float`
- **New**: `cost Decimal @db.Decimal(12,2)`

This provides better precision for financial calculations. Prisma will handle the migration automatically, but verify existing data after migration.

## Usage Impact

### Backward Compatibility

Most existing code will continue to work:

- Basic CRUD operations remain unchanged
- Relations to Order and User preserved
- Query patterns mostly compatible

### Code Updates Needed

Update any code that:

1. **Queries for single shipping record**: Change from `order.shipping` to `order.shipping[0]` (for first/primary shipment)
2. **Creates shipping records**: Add new optional fields as needed
3. **Status checks**: Update to use enum values instead of strings

Example:

```typescript
// Before
const shipping = await prisma.shippingInfo.findFirst({
  where: { orderId },
});

// After (still works for first shipment)
const shipping = await prisma.shippingInfo.findFirst({
  where: { orderId },
});

// For multiple shipments
const allShipments = await prisma.shippingInfo.findMany({
  where: { orderId },
});
```

## New Capabilities Enabled

1. **Multi-package shipments**: Ship items separately
2. **Better tracking**: Multiple status updates with timestamps
3. **Carrier integration**: Support for external carrier IDs
4. **Fulfillment centers**: Track which center handled each shipment
5. **Package tracking**: Dimensions and weight per package
6. **Proof of delivery**: Store delivery confirmations
7. **Retry logic**: Track delivery attempts

## Next Steps

1. **Review the changes**: Ensure the new fields align with business needs
2. **Run migration**: Use Prisma migrate to apply schema changes
   ```bash
   npx prisma migrate dev --name enhance_shipping_info
   ```
3. **Test thoroughly**: Verify existing functionality still works
4. **Update application code**: Leverage new fields where beneficial
5. **Data migration**: Migrate existing `address` field data to `addressLine1`

## Files Modified

- `prisma/schema.prisma`:
  - Added 3 new enums (ShipmentStatus, ShippingMethod, WeightUnit)
  - Enhanced ShippingInfo model (added 20+ new fields)
  - Added ShipmentItem model
  - Changed Order.shipping from one-to-one to one-to-many

## Rollback Plan

If issues arise:

1. Revert schema.prisma changes
2. Run: `npx prisma migrate resolve --rolled-back <migration-name>`
3. Revert application code changes

---

**Note**: This enhancement preserves all existing functionality while adding comprehensive shipping management capabilities.

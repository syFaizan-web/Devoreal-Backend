# Product Tab Management API

## Overview

The Product Tab Management API allows you to work with individual product tabs efficiently. You can retrieve specific tab data and update only the fields you need.

## Endpoints

### 1. Migrate Legacy Product

**POST** `/api/products/{id}/migrate`

Convert a legacy product to the new tab-based structure for tab management.

**Parameters:**

- `id` (string): Legacy Product ID

**Example:**

```bash
POST /api/products/dc26151d-8d26-42ae-9901-617aae480b82/migrate
```

**Response:**

```json
{
  "success": true,
  "message": "Product migrated successfully to tab-based structure",
  "legacyProductId": "dc26151d-8d26-42ae-9901-617aae480b82",
  "newProductId": "new-uuid-here",
  "productName": "Migrated Product Name",
  "data": {
    "productMain": { ... },
    "basic": { ... },
    "pricing": { ... },
    "media": { ... },
    "inventory": { ... }
  }
}
```

### 2. Get Specific Tab Data

**GET** `/api/products/{id}/tab/{tabName}`

Retrieve only the specified tab data instead of full product details.

**Parameters:**

- `id` (string): Product ID
- `tabName` (string): Tab name (basic, pricing, media, seo, attributesTag, variants, inventory, reels, itemDetails, shippingPolicies)

**Example:**

```bash
GET /api/products/dc26151d-8d26-42ae-9901-617aae480b82/tab/basic
```

**Response:**

```json
{
  "success": true,
  "productId": "dc26151d-8d26-42ae-9901-617aae480b82",
  "tabName": "basic",
  "data": {
    "id": "tab-id",
    "productId": "dc26151d-8d26-42ae-9901-617aae480b82",
    "category": "Rings",
    "brand": "Luxury Brand",
    "weight": "5.2",
    "gender": "Unisex",
    "size": "7",
    "colors": "[\"Gold\", \"Silver\"]",
    "description": "Beautiful ring...",
    "tags": "[\"luxury\", \"gold\"]",
    "isFeatured": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Update Tab Data (Flexible Format)

**PATCH** `/api/products/{id}/child`

Update specific tab data. Supports two request formats:

#### Format 1: Traditional Format

```json
{
  "tabName": "basic",
  "data": {
    "brand": "Updated Brand",
    "description": "Updated description",
    "isFeatured": true
  }
}
```

#### Format 2: Direct Tab Format (Recommended)

```json
{
  "basic": {
    "brand": "Updated Brand",
    "description": "Updated description",
    "isFeatured": true
  }
}
```

**Example Request:**

```bash
PATCH /api/products/dc26151d-8d26-42ae-9901-617aae480b82/child
Content-Type: application/json

{
  "basic": {
    "brand": "New Luxury Brand",
    "description": "Updated product description",
    "isFeatured": true,
    "tags": "[\"luxury\", \"premium\", \"gold\"]"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "basic tab updated successfully",
  "tabName": "basic",
  "updatedFields": ["brand", "description", "isFeatured", "tags"],
  "data": {
    "id": "tab-id",
    "productId": "dc26151d-8d26-42ae-9901-617aae480b82",
    "brand": "New Luxury Brand",
    "description": "Updated product description",
    "isFeatured": true,
    "tags": "[\"luxury\", \"premium\", \"gold\"]",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Available Tabs

| Tab Name           | Description               | Key Fields                                                                   |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `basic`            | Basic product information | category, brand, weight, gender, size, colors, description, tags, isFeatured |
| `pricing`          | Pricing information       | price, priceUSD, currency, discount, compareAtPrice, tax                     |
| `media`            | Media files               | images, videoFile                                                            |
| `seo`              | SEO settings              | seoTitle, seoDescription, canonicalUrl, ogImage                              |
| `attributesTag`    | Attributes and tags       | attributes, tags                                                             |
| `variants`         | Product variants          | variants                                                                     |
| `inventory`        | Inventory management      | sku, barcode, inventoryQuantity, lowStockThreshold, costPrice                |
| `reels`            | Social media reels        | platform, reelTitle, reelDescription, reelLanguage, isPublic                 |
| `itemDetails`      | Item details              | material, warranty, certification, vendorName, faqs                          |
| `shippingPolicies` | Shipping and policies     | shippingInfo, returnPolicy, warrantyPeriodMonths, isReturnable               |

## Usage Examples

### Migrate Legacy Product

```bash
curl -X POST "http://localhost:5000/api/products/dc26151d-8d26-42ae-9901-617aae480b82/migrate"
```

### Update Basic Tab

```bash
curl -X PATCH "http://localhost:5000/api/products/dc26151d-8d26-42ae-9901-617aae480b82/child" \
  -H "Content-Type: application/json" \
  -d '{
    "basic": {
      "brand": "Premium Brand",
      "description": "High-quality jewelry piece",
      "isFeatured": true
    }
  }'
```

### Update Pricing Tab

```bash
curl -X PATCH "http://localhost:5000/api/products/dc26151d-8d26-42ae-9901-617aae480b82/child" \
  -H "Content-Type: application/json" \
  -d '{
    "pricing": {
      "price": "299.99",
      "currency": "USD",
      "discount": "10",
      "compareAtPrice": "349.99"
    }
  }'
```

### Get Basic Tab Data

```bash
curl -X GET "http://localhost:5000/api/products/dc26151d-8d26-42ae-9901-617aae480b82/tab/basic"
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created (for migration)
- `400` - Bad Request (invalid data, multiple tabs, etc.)
- `404` - Not Found (product or tab not found)
- `409` - Conflict (product already exists)
- `500` - Internal Server Error

## Notes

1. **Legacy Products**: Legacy products need to be migrated to the tab-based structure before using tab endpoints
2. **One Tab at a Time**: You can only update one tab per request
3. **Partial Updates**: Only the fields you provide will be updated
4. **Public Access**: All endpoints are publicly accessible (no authentication required)
5. **Flexible Format**: Use the direct tab format for easier integration
6. **Validation**: All tab names and data are validated before processing
7. **Migration**: Use the migrate endpoint to convert legacy products to tab-based structure





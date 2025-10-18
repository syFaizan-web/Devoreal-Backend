# Vendor Management System

This document describes the comprehensive vendor management system implemented for the HurriJewels platform.

## Overview

The vendor management system provides a complete workflow for vendor onboarding, verification, and store management with role-based access control and comprehensive validation.

## Features

### 🔐 **Role-Based Access Control**

- **Customer**: Can sign up and request to become a vendor
- **Vendor**: Can submit verification documents and manage their store
- **Admin**: Can approve/reject vendor verification and manage all vendors

### 📋 **Vendor Verification Process**

1. User signs up as customer
2. User requests vendor role (creates vendor profile)
3. Vendor submits verification documents
4. Admin reviews and approves/rejects verification
5. Verified vendors can create and manage stores

### 🏪 **Store Management**

- Create, read, update, and soft delete stores
- Store information includes business details, contact info, and social media
- Store analytics (ratings, sales, product count)

## API Endpoints

### Vendor Endpoints (`/vendor`)

#### Authentication Required

All vendor endpoints require JWT authentication and vendor role.

#### 1. Submit Verification Documents

```http
POST /vendor/verify
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "businessLicense": "https://example.com/business-license.pdf",
  "taxDocument": "https://example.com/tax-document.pdf",
  "identityDocument": "https://example.com/id-document.pdf",
  "bankStatement": "https://example.com/bank-statement.pdf",
  "additionalDocs": "[\"https://example.com/doc1.pdf\", \"https://example.com/doc2.pdf\"]"
}
```

**Response:**

```json
{
  "id": "clx1234567890",
  "status": "PENDING",
  "submittedAt": "2024-01-01T00:00:00.000Z",
  "message": "Verification request submitted successfully. It will be reviewed by our team."
}
```

#### 2. Get Verification Status

```http
GET /vendor/verification-status
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "id": "clx1234567890",
  "status": "PENDING",
  "rejectionReason": null,
  "submittedAt": "2024-01-01T00:00:00.000Z",
  "reviewedAt": null,
  "reviewedBy": null
}
```

#### 3. Create Store (Verified Vendors Only)

```http
POST /vendor/store
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My Jewelry Store",
  "slug": "my-jewelry-store",
  "description": "Premium jewelry store offering unique handmade pieces",
  "logo": "https://example.com/logo.png",
  "banner": "https://example.com/banner.jpg",
  "address": "123 Main Street, Suite 100",
  "city": "New York",
  "state": "NY",
  "country": "United States",
  "postalCode": "10001",
  "phone": "+1-555-123-4567",
  "email": "contact@myjewelrystore.com",
  "website": "https://myjewelrystore.com",
  "socialMedia": "{\"facebook\": \"https://facebook.com/mystore\", \"instagram\": \"https://instagram.com/mystore\"}",
  "businessHours": "{\"monday\": \"9:00-17:00\", \"tuesday\": \"9:00-17:00\", \"sunday\": \"closed\"}"
}
```

#### 4. Get Vendor Store

```http
GET /vendor/store
Authorization: Bearer <jwt_token>
```

#### 5. Update Store

```http
PUT /vendor/store/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Updated Store Name",
  "description": "Updated description",
  "phone": "+1-555-987-6543"
}
```

#### 6. Delete Store (Soft Delete)

```http
DELETE /vendor/store/:id
Authorization: Bearer <jwt_token>
```

### Admin Endpoints (`/admin/vendors`)

#### Authentication Required

All admin endpoints require JWT authentication and admin role.

#### 1. Get All Vendors (with pagination and filters)

```http
GET /admin/vendors?status=PENDING&page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `status`: Filter by verification status (PENDING, APPROVED, REJECTED)
- `isActive`: Filter by vendor active status (true/false)
- `search`: Search by business name or email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sortBy`: Sort field (createdAt, updatedAt, businessName, rating, totalSales)
- `sortOrder`: Sort order (asc, desc)

**Response:**

```json
{
  "vendors": [
    {
      "id": "clx1234567890",
      "userId": "clx1234567890",
      "businessName": "Premium Jewelry Store",
      "businessDescription": "High-quality jewelry and accessories",
      "businessEmail": "contact@premiumjewelry.com",
      "businessPhone": "+1-555-123-4567",
      "isVerified": true,
      "isActive": true,
      "rating": 4.5,
      "totalSales": 50000.0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "user": {
        "id": "clx1234567890",
        "email": "vendor@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1-555-123-4567",
        "isEmailVerified": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      "verification": {
        "id": "clx1234567890",
        "status": "APPROVED",
        "submittedAt": "2024-01-01T00:00:00.000Z",
        "reviewedAt": "2024-01-02T00:00:00.000Z",
        "rejectionReason": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "status": "PENDING",
    "isActive": null,
    "search": null,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

#### 2. Get Vendor Details

```http
GET /admin/vendors/:id
Authorization: Bearer <jwt_token>
```

#### 3. Approve Vendor Verification

```http
PUT /admin/vendors/:id/approve
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "notes": "All documents verified successfully"
}
```

**Response:**

```json
{
  "message": "Vendor verification approved successfully.",
  "vendorId": "clx1234567890",
  "status": "APPROVED",
  "reviewedAt": "2024-01-02T00:00:00.000Z",
  "reviewedBy": "clx1234567890"
}
```

#### 4. Reject Vendor Verification

```http
PUT /admin/vendors/:id/reject
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "reason": "Incomplete business license documentation"
}
```

**Response:**

```json
{
  "message": "Vendor verification rejected.",
  "vendorId": "clx1234567890",
  "status": "REJECTED",
  "rejectionReason": "Incomplete business license documentation",
  "reviewedAt": "2024-01-02T00:00:00.000Z",
  "reviewedBy": "clx1234567890"
}
```

## Database Schema

### VendorVerification Model

```prisma
model VendorVerification {
  id                String    @id @default(cuid())
  vendorId          String    @unique
  status            String    @default("PENDING") // PENDING, APPROVED, REJECTED
  businessLicense   String?   // File path or URL
  taxDocument       String?   // File path or URL
  identityDocument  String?   // File path or URL
  bankStatement     String?   // File path or URL
  additionalDocs    String?   // JSON array of additional document paths
  rejectionReason   String?
  reviewedBy        String?   // Admin user ID who reviewed
  reviewedAt        DateTime?
  submittedAt       DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  vendor            VendorProfile @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  reviewer          User?     @relation("VendorVerificationReviewer", fields: [reviewedBy], references: [id])

  @@map("vendor_verifications")
}
```

### Store Model

```prisma
model Store {
  id                String    @id @default(cuid())
  vendorId          String
  name              String
  slug              String    @unique
  description       String?
  logo              String?
  banner            String?
  address           String?
  city              String?
  state             String?
  country           String?
  postalCode        String?
  phone             String?
  email             String?
  website           String?
  socialMedia       String?   // JSON object with social media links
  businessHours     String?   // JSON object with business hours
  isActive          Boolean   @default(true)
  isDeleted         Boolean   @default(false)
  rating            Float     @default(0)
  totalProducts     Int       @default(0)
  totalOrders       Int       @default(0)
  totalSales        Float     @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  vendor            VendorProfile @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  products          Product[]

  @@map("stores")
}
```

## Validation Rules

### Store Creation/Update

- **Name**: 2-100 characters, required
- **Slug**: 2-50 characters, lowercase letters/numbers/hyphens only, unique, required
- **Description**: Max 1000 characters, optional
- **Email**: Valid email format, max 100 characters, optional
- **Phone**: Max 20 characters, optional
- **Website**: Valid URL format, max 200 characters, optional
- **Social Media**: Valid JSON object, optional
- **Business Hours**: Valid JSON object, optional

### Verification Documents

- **Business License**: Valid URL, max 500 characters, optional
- **Tax Document**: Valid URL, max 500 characters, optional
- **Identity Document**: Valid URL, max 500 characters, optional
- **Bank Statement**: Valid URL, max 500 characters, optional
- **Additional Docs**: Valid JSON array of URLs, optional
- **At least one document must be provided**

## Security Features

### 🔒 **Access Control**

- JWT authentication required for all endpoints
- Role-based authorization (VENDOR, ADMIN)
- Vendor verification status checks
- Store ownership validation

### 🛡️ **Data Validation**

- Comprehensive input validation using class-validator
- SQL injection prevention through Prisma ORM
- XSS protection through input sanitization
- File upload validation (URL format)

### 📊 **Audit Trail**

- Verification review tracking (reviewer, timestamp)
- Store modification history
- Soft delete for data retention

## Error Handling

### Common Error Responses

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "name": ["Store name must be at least 2 characters long"],
    "slug": ["Store slug can only contain lowercase letters, numbers, and hyphens"]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Vendor must be verified before creating a store.",
  "error": "Forbidden"
}
```

#### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Store not found or does not belong to this vendor.",
  "error": "Not Found"
}
```

## Usage Examples

### Complete Vendor Onboarding Flow

1. **User Registration** (Customer role)
2. **Request Vendor Role** (Create vendor profile)
3. **Submit Verification Documents**
4. **Admin Review and Approval**
5. **Create Store**
6. **Manage Store**

### Frontend Integration

```typescript
// Submit verification
const submitVerification = async (documents: VerificationDocuments) => {
  const response = await fetch('/vendor/verify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(documents),
  });
  return response.json();
};

// Create store
const createStore = async (storeData: CreateStoreData) => {
  const response = await fetch('/vendor/store', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(storeData),
  });
  return response.json();
};
```

## Testing

### Test Scenarios

- Vendor verification submission and status checking
- Store creation, update, and deletion
- Admin vendor management operations
- Role-based access control
- Input validation and error handling

### Run Tests

```bash
npm test -- --testPathPattern=vendors
```

## Future Enhancements

1. **File Upload Integration**: Direct file upload instead of URL references
2. **Email Notifications**: Automated emails for verification status changes
3. **Advanced Analytics**: Detailed vendor performance metrics
4. **Multi-Store Support**: Allow vendors to manage multiple stores
5. **Store Categories**: Categorize stores by business type
6. **Store Reviews**: Customer review system for stores
7. **Commission Management**: Track and manage vendor commissions
8. **Store Templates**: Pre-designed store layouts and themes

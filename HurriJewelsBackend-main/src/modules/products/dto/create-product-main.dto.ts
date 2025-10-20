import { IsString, IsOptional, IsBoolean, IsObject, IsArray, IsNumber, IsUUID, IsEnum, IsDateString, IsUrl, Min, Max, Length, IsInt, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// Basic Tab DTO
export class BasicTabDto {
  @ApiPropertyOptional({ description: 'Category ID (must exist in categories table)' })
  @IsOptional()
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Collection ID (must exist in collections table)' })
  @IsOptional()
  @IsUUID(4, { message: 'Collection ID must be a valid UUID' })
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Signature Piece ID (must exist in signature pieces table)' })
  @IsOptional()
  @IsUUID(4, { message: 'Signature Piece ID must be a valid UUID' })
  signaturePieceId?: string;

  @ApiPropertyOptional({ description: 'Product brand' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Brand must be between 1 and 100 characters' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Product weight in grams' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0, { message: 'Weight must be positive' })
  weight?: number;

  @ApiPropertyOptional({ description: 'Product gender', enum: ['Male', 'Female', 'Unisex'] })
  @IsOptional()
  @IsEnum(['Male', 'Female', 'Unisex'], { message: 'Gender must be Male, Female, or Unisex' })
  gender?: string;

  @ApiPropertyOptional({ description: 'Product size' })
  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'Size must be between 1 and 20 characters' })
  size?: string;

  @ApiPropertyOptional({ description: 'Product colors (JSON array)' })
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional({ description: 'Color name' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Color name must be between 1 and 50 characters' })
  colorName?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  @Length(1, 2000, { message: 'Description must be between 1 and 2000 characters' })
  description?: string;

  @ApiPropertyOptional({ description: 'Tag number' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Tag number must be between 1 and 50 characters' })
  tagNumber?: string;

  @ApiPropertyOptional({ description: 'Stock quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Stock must be an integer' })
  @Min(0, { message: 'Stock must be non-negative' })
  stock?: number;

  @ApiPropertyOptional({ description: 'Product tags (JSON array)' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Product slug' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Slug must be between 1 and 100 characters' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Product status', enum: ['active', 'inactive', 'draft'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'draft'], { message: 'Status must be active, inactive, or draft' })
  status?: string;

  @ApiPropertyOptional({ description: 'Product visibility', enum: ['PUBLIC', 'UNLISTED', 'HIDDEN'] })
  @IsOptional()
  @IsEnum(['PUBLIC', 'UNLISTED', 'HIDDEN'], { message: 'Visibility must be PUBLIC, UNLISTED, or HIDDEN' })
  visibility?: string;

  @ApiPropertyOptional({ description: 'Published date (ISO string)' })
  @IsOptional()
  @IsDateString({}, { message: 'Published date must be a valid ISO date string' })
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'Is signature piece' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSignaturePiece?: boolean;

  @ApiPropertyOptional({ description: 'Is featured' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Signature label' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Signature label must be between 1 and 100 characters' })
  signatureLabel?: string;

  @ApiPropertyOptional({ description: 'Signature story' })
  @IsOptional()
  @IsString()
  @Length(1, 1000, { message: 'Signature story must be between 1 and 1000 characters' })
  signatureStory?: string;

  @ApiPropertyOptional({ description: 'Allow backorder' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowBackorder?: boolean;

  @ApiPropertyOptional({ description: 'Is preorder' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPreorder?: boolean;

  @ApiPropertyOptional({ description: 'Minimum order quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Minimum order quantity must be an integer' })
  @Min(1, { message: 'Minimum order quantity must be at least 1' })
  minOrderQty?: number;

  @ApiPropertyOptional({ description: 'Maximum order quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Maximum order quantity must be an integer' })
  @Min(1, { message: 'Maximum order quantity must be at least 1' })
  maxOrderQty?: number;

  @ApiPropertyOptional({ description: 'Lead time in days' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Lead time must be an integer' })
  @Min(0, { message: 'Lead time must be non-negative' })
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'HS Code' })
  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'HS Code must be between 1 and 20 characters' })
  hsCode?: string;

  @ApiPropertyOptional({ description: 'Warranty information' })
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Warranty info must be between 1 and 500 characters' })
  warrantyInfo?: string;

  @ApiPropertyOptional({ description: 'Size guide URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Size guide URL must be a valid URL' })
  sizeGuideUrl?: string;

  @ApiPropertyOptional({ description: 'Product badges (JSON array)' })
  @IsOptional()
  @IsString()
  badges?: string;

  // Removed rating, reviewsCount, views - these are now read-only in ProductMain

  @ApiPropertyOptional({ description: 'Sales count' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Sales count must be an integer' })
  @Min(0, { message: 'Sales count must be non-negative' })
  sales?: number;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be non-negative' })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Review UI' })
  @IsOptional()
  @IsString()
  reviewUi?: string;

  @ApiPropertyOptional({ description: 'Sold UI' })
  @IsOptional()
  @IsString()
  soldUi?: string;
}

// Pricing Tab DTO
export class PricingTabDto {
  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be positive' })
  price?: number;

  @ApiPropertyOptional({ description: 'Price in USD' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'USD price must be a number' })
  @Min(0, { message: 'USD price must be positive' })
  priceUSD?: number;

  @ApiPropertyOptional({ description: 'Currency', enum: ['PKR', 'USD', 'EUR', 'GBP'] })
  @IsOptional()
  @IsEnum(['PKR', 'USD', 'EUR', 'GBP'], { message: 'Currency must be PKR, USD, EUR, or GBP' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Discount percentage (0-100)' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Discount must be a number' })
  @Min(0, { message: 'Discount must be at least 0' })
  @Max(100, { message: 'Discount must be at most 100' })
  discount?: number;

  @ApiPropertyOptional({ description: 'Discount type', enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsEnum(['percentage', 'fixed'], { message: 'Discount type must be percentage or fixed' })
  discountType?: string;

  @ApiPropertyOptional({ description: 'Compare at price' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Compare at price must be a number' })
  @Min(0, { message: 'Compare at price must be positive' })
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Sale start date (ISO string)' })
  @IsOptional()
  @IsDateString({}, { message: 'Sale start date must be a valid ISO date string' })
  saleStartAt?: string;

  @ApiPropertyOptional({ description: 'Sale end date (ISO string)' })
  @IsOptional()
  @IsDateString({}, { message: 'Sale end date must be a valid ISO date string' })
  saleEndAt?: string;

  @ApiPropertyOptional({ description: 'Discount label' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Discount label must be between 1 and 100 characters' })
  discountLabel?: string;

  @ApiPropertyOptional({ description: 'Tax percentage (0-100)' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Tax must be a number' })
  @Min(0, { message: 'Tax must be at least 0' })
  @Max(100, { message: 'Tax must be at most 100' })
  tax?: number;
}

// Media Tab DTO
export class MediaTabDto {
  // Removed images field - images are now handled via file upload only
}

// SEO Tab DTO
export class SeoTabDto {
  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  @Length(1, 60, { message: 'SEO title must be between 1 and 60 characters' })
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  @Length(1, 160, { message: 'SEO description must be between 1 and 160 characters' })
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Canonical URL must be a valid URL' })
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'OG image URL' })
  @IsOptional()
  @IsUrl({}, { message: 'OG image URL must be a valid URL' })
  ogImage?: string;
}

// Association Tab DTO - REMOVED (no longer needed)

// Attributes & Tags Tab DTO
export class AttributesTagTabDto {
  @ApiPropertyOptional({ description: 'Product attributes (JSON object)' })
  @IsOptional()
  @IsString()
  attributes?: string;

  @ApiPropertyOptional({ description: 'Product tags (JSON array)' })
  @IsOptional()
  @IsString()
  tags?: string;
}

// Variants Tab DTO
export class VariantsTabDto {
  @ApiPropertyOptional({ description: 'Product variants (JSON array)' })
  @IsOptional()
  @IsString()
  variants?: string;
}

// Inventory Tab DTO
export class InventoryTabDto {
  @ApiPropertyOptional({ description: 'Product SKU' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'SKU must be between 1 and 50 characters' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Product barcode' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Barcode must be between 1 and 50 characters' })
  barcode?: string;

  @ApiPropertyOptional({ description: 'Inventory quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Inventory quantity must be an integer' })
  @Min(0, { message: 'Inventory quantity must be non-negative' })
  inventoryQuantity?: number;

  @ApiPropertyOptional({ description: 'Low stock threshold' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Low stock threshold must be an integer' })
  @Min(0, { message: 'Low stock threshold must be non-negative' })
  lowStockThreshold?: number;

  @ApiPropertyOptional({ description: 'Reorder point' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Reorder point must be an integer' })
  @Min(0, { message: 'Reorder point must be non-negative' })
  reorderPoint?: number;

  @ApiPropertyOptional({ description: 'Reorder quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Reorder quantity must be an integer' })
  @Min(0, { message: 'Reorder quantity must be non-negative' })
  reorderQuantity?: number;

  @ApiPropertyOptional({ description: 'Supplier name' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Supplier must be between 1 and 100 characters' })
  supplier?: string;

  @ApiPropertyOptional({ description: 'Supplier SKU' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Supplier SKU must be between 1 and 50 characters' })
  supplierSku?: string;

  @ApiPropertyOptional({ description: 'Cost price' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Cost price must be a number' })
  @Min(0, { message: 'Cost price must be positive' })
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Margin percentage (0-100)' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Margin must be a number' })
  @Min(0, { message: 'Margin must be at least 0' })
  @Max(100, { message: 'Margin must be at most 100' })
  margin?: number;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Location must be between 1 and 100 characters' })
  location?: string;

  @ApiPropertyOptional({ description: 'Warehouse' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Warehouse must be between 1 and 100 characters' })
  warehouse?: string;

  @ApiPropertyOptional({ description: 'Bin location' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Bin location must be between 1 and 50 characters' })
  binLocation?: string;

  @ApiPropertyOptional({ description: 'Last restocked date (ISO string)' })
  @IsOptional()
  @IsDateString({}, { message: 'Last restocked date must be a valid ISO date string' })
  lastRestocked?: string;

  @ApiPropertyOptional({ description: 'Next restock date (ISO string)' })
  @IsOptional()
  @IsDateString({}, { message: 'Next restock date must be a valid ISO date string' })
  nextRestockDate?: string;

  @ApiPropertyOptional({ description: 'Inventory status', enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'] })
  @IsOptional()
  @IsEnum(['in_stock', 'low_stock', 'out_of_stock', 'discontinued'], { message: 'Inventory status must be in_stock, low_stock, out_of_stock, or discontinued' })
  inventoryStatus?: string;

  @ApiPropertyOptional({ description: 'Track inventory' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Reserved quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Reserved quantity must be an integer' })
  @Min(0, { message: 'Reserved quantity must be non-negative' })
  reservedQuantity?: number;

  @ApiPropertyOptional({ description: 'Available quantity' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Available quantity must be an integer' })
  @Min(0, { message: 'Available quantity must be non-negative' })
  availableQuantity?: number;
}

// Reels Tab DTO
export class ReelsTabDto {
  @ApiPropertyOptional({ description: 'Platform', enum: ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Upload'] })
  @IsOptional()
  @IsEnum(['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Upload'], { message: 'Platform must be Instagram, TikTok, YouTube, Facebook, or Upload' })
  platform?: string;

  @ApiPropertyOptional({ description: 'Video file path' })
  @IsOptional()
  @IsString()
  videoFile?: string;

  @ApiPropertyOptional({ description: 'Reel title' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Reel title must be between 1 and 100 characters' })
  reelTitle?: string;

  @ApiPropertyOptional({ description: 'Reel description' })
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Reel description must be between 1 and 500 characters' })
  reelDescription?: string;

  @ApiPropertyOptional({ description: 'Reel language', enum: ['en', 'ur', 'ar', 'hi', 'es', 'fr'] })
  @IsOptional()
  @IsEnum(['en', 'ur', 'ar', 'hi', 'es', 'fr'], { message: 'Language must be en, ur, ar, hi, es, or fr' })
  reelLanguage?: string;

  @ApiPropertyOptional({ description: 'Captions URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Captions URL must be a valid URL' })
  captionsUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Thumbnail URL must be a valid URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Duration must be an integer' })
  @Min(1, { message: 'Duration must be at least 1 second' })
  @Max(300, { message: 'Duration must be at most 300 seconds' })
  durationSec?: number;

  @ApiPropertyOptional({ description: 'Aspect ratio', enum: ['9:16', '16:9', '1:1', '4:5'] })
  @IsOptional()
  @IsEnum(['9:16', '16:9', '1:1', '4:5'], { message: 'Aspect ratio must be 9:16, 16:9, 1:1, or 4:5' })
  aspectRatio?: string;

  @ApiPropertyOptional({ description: 'CTA URL' })
  @IsOptional()
  @IsUrl({}, { message: 'CTA URL must be a valid URL' })
  ctaUrl?: string;

  @ApiPropertyOptional({ description: 'Reel tags (comma-separated)' })
  @IsOptional()
  @IsString()
  @Length(1, 200, { message: 'Reel tags must be between 1 and 200 characters' })
  reelTags?: string;

  @ApiPropertyOptional({ description: 'Is public' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Is pinned' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Reel order' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Reel order must be an integer' })
  @Min(1, { message: 'Reel order must be at least 1' })
  reelOrder?: number;
}

// Item Details Tab DTO
export class ItemDetailsTabDto {
  @ApiPropertyOptional({ description: 'Material' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: 'Warranty' })
  @IsOptional()
  @IsString()
  warranty?: string;

  @ApiPropertyOptional({ description: 'Certification' })
  @IsOptional()
  @IsString()
  certification?: string;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Shipping free text' })
  @IsOptional()
  @IsString()
  shippingFreeText?: string;

  @ApiPropertyOptional({ description: 'Quality guarantee text' })
  @IsOptional()
  @IsString()
  qualityGuaranteeText?: string;

  @ApiPropertyOptional({ description: 'Care instructions text' })
  @IsOptional()
  @IsString()
  careInstructionsText?: string;

  @ApiPropertyOptional({ description: 'Did you know' })
  @IsOptional()
  @IsString()
  didYouKnow?: string;

  @ApiPropertyOptional({ description: 'FAQs (JSON array)' })
  @IsOptional()
  @IsString()
  faqs?: string;

  @ApiPropertyOptional({ description: 'Seller blurb' })
  @IsOptional()
  @IsString()
  sellerBlurb?: string;

  @ApiPropertyOptional({ description: 'Trust badges (JSON array of badge objects)' })
  @IsOptional()
  @IsString()
  @Length(1, 1000, { message: 'Trust badges must be between 1 and 1000 characters' })
  trustBadges?: string;
}

// Shipping & Policies Tab DTO
export class ShippingPoliciesTabDto {
  @ApiPropertyOptional({ description: 'Shipping information' })
  @IsOptional()
  @IsString()
  shippingInfo?: string;

  @ApiPropertyOptional({ description: 'Shipping notes' })
  @IsOptional()
  @IsString()
  shippingNotes?: string;

  @ApiPropertyOptional({ description: 'Packaging details' })
  @IsOptional()
  @IsString()
  packagingDetails?: string;

  @ApiPropertyOptional({ description: 'Return policy' })
  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @ApiPropertyOptional({ description: 'Return window in days' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Return window must be an integer' })
  @Min(0, { message: 'Return window must be non-negative' })
  @Max(365, { message: 'Return window must be at most 365 days' })
  returnWindowDays?: number;

  @ApiPropertyOptional({ description: 'Return fees' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Return fees must be a number' })
  @Min(0, { message: 'Return fees must be non-negative' })
  returnFees?: number;

  @ApiPropertyOptional({ description: 'Is returnable' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isReturnable?: boolean;

  @ApiPropertyOptional({ description: 'Exchange policy' })
  @IsOptional()
  @IsString()
  @Length(1, 1000, { message: 'Exchange policy must be between 1 and 1000 characters' })
  exchangePolicy?: string;

  @ApiPropertyOptional({ description: 'Warranty period in months' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'Warranty period must be an integer' })
  @Min(0, { message: 'Warranty period must be non-negative' })
  @Max(120, { message: 'Warranty period must be at most 120 months' })
  warrantyPeriodMonths?: number;

  @ApiPropertyOptional({ description: 'Warranty type', enum: ['manufacturer', 'seller', 'extended', 'none'] })
  @IsOptional()
  @IsEnum(['manufacturer', 'seller', 'extended', 'none'], { message: 'Warranty type must be manufacturer, seller, extended, or none' })
  warrantyType?: string;

  @ApiPropertyOptional({ description: 'Origin country' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Origin country must be between 1 and 100 characters' })
  originCountry?: string;

  @ApiPropertyOptional({ description: 'Weight in kg' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0, { message: 'Weight must be positive' })
  @Max(1000, { message: 'Weight must be at most 1000 kg' })
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Dimensions (L x W x H in cm)' })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Dimensions must be between 1 and 50 characters' })
  dimensions?: string;
}

export class CreateProductMainDto {
  @ApiProperty({ description: 'Product name' })
  @IsString({ message: 'Product name must be a string' })
  @Length(1, 200, { message: 'Product name must be between 1 and 200 characters' })
  name: string;

  @ApiPropertyOptional({ description: 'Main product image URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Image must be a valid URL' })
  image?: string;

  @ApiPropertyOptional({ description: 'Short description for listing' })
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Short description must be between 1 and 500 characters' })
  shortDescription?: string;

  // Read-only fields (managed by system)
  @ApiHideProperty()
  rating?: number;

  @ApiHideProperty()
  reviewsCount?: number;

  @ApiHideProperty()
  views?: number;

  @ApiHideProperty()
  createdBy?: string;

  // Child tab data with detailed DTOs
  @ApiPropertyOptional({ description: 'Basic tab data', type: BasicTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BasicTabDto)
  basic?: BasicTabDto;

  @ApiPropertyOptional({ description: 'Pricing tab data', type: PricingTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingTabDto)
  pricing?: PricingTabDto;

  @ApiPropertyOptional({ description: 'Media tab data', type: MediaTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTabDto)
  media?: MediaTabDto;

  @ApiPropertyOptional({ description: 'SEO tab data', type: SeoTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoTabDto)
  seo?: SeoTabDto;

  @ApiPropertyOptional({ description: 'Attributes & Tags tab data', type: AttributesTagTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttributesTagTabDto)
  attributesTag?: AttributesTagTabDto;

  @ApiPropertyOptional({ description: 'Variants tab data', type: VariantsTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VariantsTabDto)
  variants?: VariantsTabDto;

  @ApiPropertyOptional({ description: 'Inventory tab data', type: InventoryTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InventoryTabDto)
  inventory?: InventoryTabDto;

  @ApiPropertyOptional({ description: 'Reels tab data', type: ReelsTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReelsTabDto)
  reels?: ReelsTabDto;

  @ApiPropertyOptional({ description: 'Item Details tab data', type: ItemDetailsTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ItemDetailsTabDto)
  itemDetails?: ItemDetailsTabDto;

  @ApiPropertyOptional({ description: 'Shipping & Policies tab data', type: ShippingPoliciesTabDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingPoliciesTabDto)
  shippingPolicies?: ShippingPoliciesTabDto;
}

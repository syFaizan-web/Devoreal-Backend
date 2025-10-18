-- Normalize isActive and isDeleted to be opposites across known tables

-- Users
UPDATE public.users SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Categories
UPDATE public.categories SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Products
UPDATE public.products SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Vendor Profiles
UPDATE public.vendor_profiles SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Vendor Verifications
UPDATE public.vendor_verifications SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Stores
UPDATE public.stores SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Orders
UPDATE public.orders SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Order Items
UPDATE public.order_items SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Payments
UPDATE public.payments SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Shipping Info
UPDATE public.shipping_info SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- AI Models
UPDATE public.ai_models SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Reviews
UPDATE public.reviews SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Audit Logs
UPDATE public.audit_logs SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- Menu Items
UPDATE public.menu_items SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));



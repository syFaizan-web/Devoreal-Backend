-- Normalize and enforce isActive = NOT isDeleted across tables

-- 1) Normalize existing data first
UPDATE public.users SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.categories SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.products SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.vendor_profiles SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.vendor_verifications SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.stores SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.orders SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.order_items SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.payments SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.shipping_info SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.ai_models SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.reviews SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.audit_logs SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));
UPDATE public.menu_items SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE));

-- 2) Add constraints if not existing
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT 'users' AS tbl UNION ALL
    SELECT 'categories' UNION ALL
    SELECT 'products' UNION ALL
    SELECT 'vendor_profiles' UNION ALL
    SELECT 'vendor_verifications' UNION ALL
    SELECT 'stores' UNION ALL
    SELECT 'orders' UNION ALL
    SELECT 'order_items' UNION ALL
    SELECT 'payments' UNION ALL
    SELECT 'shipping_info' UNION ALL
    SELECT 'ai_models' UNION ALL
    SELECT 'reviews' UNION ALL
    SELECT 'audit_logs' UNION ALL
    SELECT 'menu_items'
  ) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE c.conname = format('%I_isactive_not_isdeleted_ck', r.tbl)
        AND n.nspname = 'public'
        AND t.relname = r.tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK ("isActive" = NOT COALESCE("isDeleted", FALSE)) NOT VALID', r.tbl, r.tbl || '_isactive_not_isdeleted_ck');
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', r.tbl, r.tbl || '_isactive_not_isdeleted_ck');
    END IF;
  END LOOP;
END $$;



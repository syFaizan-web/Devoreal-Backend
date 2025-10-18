-- Safely rename or create audit columns for users and categories
-- This script avoids data loss by renaming existing columns when present.

-- USERS
DO $$
BEGIN
  -- UpdatedTime
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'UpdatedTime'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updatedAt'
    ) THEN
      EXECUTE 'ALTER TABLE public.users RENAME COLUMN "updatedAt" TO "UpdatedTime"';
    ELSE
      EXECUTE 'ALTER TABLE public.users ADD COLUMN "UpdatedTime" timestamp with time zone DEFAULT now() NOT NULL';
    END IF;
  END IF;

  -- UpdatedBy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'UpdatedBy'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updatedBy'
    ) THEN
      EXECUTE 'ALTER TABLE public.users RENAME COLUMN "updatedBy" TO "UpdatedBy"';
    ELSE
      EXECUTE 'ALTER TABLE public.users ADD COLUMN "UpdatedBy" text';
    END IF;
  END IF;

  -- DeletedTime
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'DeletedTime'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deletedAt'
    ) THEN
      EXECUTE 'ALTER TABLE public.users RENAME COLUMN "deletedAt" TO "DeletedTime"';
    ELSE
      EXECUTE 'ALTER TABLE public.users ADD COLUMN "DeletedTime" timestamp with time zone';
    END IF;
  END IF;

  -- DeletedBy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'DeletedBy'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deletedBy'
    ) THEN
      EXECUTE 'ALTER TABLE public.users RENAME COLUMN "deletedBy" TO "DeletedBy"';
    ELSE
      EXECUTE 'ALTER TABLE public.users ADD COLUMN "DeletedBy" text';
    END IF;
  END IF;
END $$;

-- MENU ITEMS: align deletedDateTime -> deletedAt
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'deletedDateTime'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'deletedAt'
  ) THEN
    EXECUTE 'ALTER TABLE public.menu_items RENAME COLUMN "deletedDateTime" TO "deletedAt"';
  END IF;
END $$;

-- CATEGORIES
DO $$
BEGIN
  -- UpdatedTime
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'UpdatedTime'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'updatedAt'
    ) THEN
      EXECUTE 'ALTER TABLE public.categories RENAME COLUMN "updatedAt" TO "UpdatedTime"';
    ELSE
      EXECUTE 'ALTER TABLE public.categories ADD COLUMN "UpdatedTime" timestamp with time zone DEFAULT now() NOT NULL';
    END IF;
  END IF;

  -- UpdatedBy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'UpdatedBy'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'updatedBy'
    ) THEN
      EXECUTE 'ALTER TABLE public.categories RENAME COLUMN "updatedBy" TO "UpdatedBy"';
    ELSE
      EXECUTE 'ALTER TABLE public.categories ADD COLUMN "UpdatedBy" text';
    END IF;
  END IF;

  -- DeletedTime
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'DeletedTime'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'deletedAt'
    ) THEN
      EXECUTE 'ALTER TABLE public.categories RENAME COLUMN "deletedAt" TO "DeletedTime"';
    ELSE
      EXECUTE 'ALTER TABLE public.categories ADD COLUMN "DeletedTime" timestamp with time zone';
    END IF;
  END IF;

  -- DeletedBy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'DeletedBy'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'deletedBy'
    ) THEN
      EXECUTE 'ALTER TABLE public.categories RENAME COLUMN "deletedBy" TO "DeletedBy"';
    ELSE
      EXECUTE 'ALTER TABLE public.categories ADD COLUMN "DeletedBy" text';
    END IF;
  END IF;
END $$;



import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContextService } from '../services/request-context.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService, private readonly requestContext: RequestContextService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: configService.get('NODE_ENV') === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    // Middleware to enforce isActive = NOT isDeleted across all models that have these fields
    this.$use(async (params, next) => {
      const { action, model } = params;

      // Whitelist models that have BOTH isActive and isDeleted fields
      const enforceModels = new Set([
        'User',
        'VendorProfile',
        'VendorVerification',
        'Store',
        'Category',
        'Product',
        'Order',
        'OrderItem',
        'Payment',
        'ShippingInfo',
        'AIModel',
        'Review',
        'AuditLog',
        'MenuItem',
      ]);

      // Only act on write operations
      if (enforceModels.has(model!) && (action === 'create' || action === 'update' || action === 'upsert' || action === 'updateMany')) {
        const { userId, role, fullName } = this.requestContext.getContext();
        this.logger.debug('Prisma Middleware - Context', { userId, role, fullName, action, model });
        // Helper to enforce consistency on provided data objects
        const enforceFlags = (data: Record<string, any> | undefined) => {
          if (!data) return;
          const hasIsDeleted = Object.prototype.hasOwnProperty.call(data, 'isDeleted');
          const hasIsActive = Object.prototype.hasOwnProperty.call(data, 'isActive');

          const isDeletedIsBoolean = hasIsDeleted && typeof (data as any).isDeleted === 'boolean';
          const isActiveIsBoolean = hasIsActive && typeof (data as any).isActive === 'boolean';

          // Only enforce when the provided value is explicitly boolean
          if (isDeletedIsBoolean) {
            data.isActive = (data as any).isDeleted === true ? false : true;
            // When deleting, set DeletedBy if context present
            if ((data as any).isDeleted === true && userId) {
              (data as any).deletedBy = userId;
            }
          } else if (isActiveIsBoolean) {
            data.isDeleted = (data as any).isActive === true ? false : true;
          }

          // Auto-populate audit fields based on action
          if (action === 'create' && userId) {
            const createdByValue = fullName || userId;
            if (!Object.prototype.hasOwnProperty.call(data, 'createdBy')) {
              (data as any).createdBy = createdByValue;
            }
          }
          if (action === 'update' || action === 'upsert' || action === 'updateMany') {
            if (userId && !Object.prototype.hasOwnProperty.call(data, 'updatedBy')) {
              (data as any).updatedBy = fullName || userId;
            }
          }
        };

        if (action === 'create' || action === 'update') {
          enforceFlags((params as any).args?.data);
        } else if (action === 'updateMany') {
          enforceFlags((params as any).args?.data);
        } else if (action === 'upsert') {
          enforceFlags((params as any).args?.create);
          enforceFlags((params as any).args?.update);
        }
      }

      return next(params);
    });

    await this.$connect();
    this.logger.log('Database connected successfully');

    // Optional Prisma event logging (type cast to any to keep compatibility across prisma versions)
    const logPrisma = (process.env.LOG_PRISMA_QUERIES || 'false').toLowerCase() === 'true';
    if (logPrisma && (this as any).$on) {
      (this as any).$on('query', (e: any) => {
        this.logger.debug('Prisma query', {
          durationMs: e?.duration,
          target: e?.target,
        });
      });
    }

    if ((this as any).$on) {
      (this as any).$on('error', (e: any) => {
        this.logger.error('Prisma error', {
          message: e?.message,
          target: e?.target,
        });
      });
    }

    // Ensure Role enum has USER and set default; migrate CUSTOMER -> USER
    try {
      await this.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Add enum value USER if missing
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
          ) THEN
            ALTER TYPE "Role" ADD VALUE 'USER';
          END IF;
        END $$;
      `);

      // Set users.role default to USER
      await this.$executeRawUnsafe(
        `ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'USER'::"Role";`
      );

      // Migrate existing CUSTOMER rows to USER (if CUSTOMER exists)
      await this.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'Role' AND e.enumlabel = 'CUSTOMER'
          ) THEN
            UPDATE public.users SET role = 'USER'::"Role" WHERE role = 'CUSTOMER'::"Role";
          END IF;
        END $$;
      `);
    } catch (e) {
      this.logger.warn('Role enum normalization skipped', { error: (e as any)?.message });
    }

    // One-time normalization to fix any rows out of sync (must run after connect)
    try {
      const tables = [
        'users',
        'categories',
        'products',
        'vendor_profiles',
        'vendor_verifications',
        'stores',
        'orders',
        'order_items',
        'payments',
        'shipping_info',
        'ai_models',
        'reviews',
        'audit_logs',
        'menu_items',
      ];
      for (const tbl of tables) {
        await this.$executeRawUnsafe(
          `UPDATE public.${tbl} SET "isActive" = CASE WHEN "isDeleted" IS TRUE THEN FALSE ELSE TRUE END WHERE "isActive" IS DISTINCT FROM (NOT COALESCE("isDeleted", FALSE))`
        );
      }
    } catch (e) {
      this.logger.warn('Normalization skipped', { error: (e as any)?.message });
    }

    // Ensure DB constraints exist to enforce consistency
    try {
      await this.$executeRawUnsafe(`
        DO $$
        DECLARE r RECORD;
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
      `);
    } catch (e) {
      this.logger.warn('Constraint setup skipped', { error: (e as any)?.message });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (this.configService.get('NODE_ENV') === 'test') {
      const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;

      const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');

      try {
        await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      } catch (error) {
        this.logger.error('Failed to clean database', error.stack);
      }
    }
  }
}

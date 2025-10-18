import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createWinstonOptions } from './libs/logger';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './common/health/health.module';
import { RbacModule } from './common/rbac/rbac.module';
import { GlobalServicesModule } from './common/services/global-services.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { MenuModule } from './modules/menu/menu.module';
import { AdminModule } from './modules/admin/admin.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { SignaturePiecesModule } from './modules/signature-pieces/signature-pieces.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { SearchModule } from './modules/search/search.module';

import { validationSchema } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
      }),
    }),
    TerminusModule,
    WinstonModule.forRoot(createWinstonOptions()),
    DatabaseModule,
    HealthModule,
    GlobalServicesModule,
    RbacModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    ProductsModule,
    CategoriesModule,
    MenuModule,
    AdminModule,
    CollectionsModule,
    SignaturePiecesModule,
    ArticlesModule,
    EngagementModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
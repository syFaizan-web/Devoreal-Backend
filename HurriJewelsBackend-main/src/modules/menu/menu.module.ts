import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { FileUploadModule } from '../../common/file-upload/file-upload.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DatabaseModule } from '../../common/database/database.module';
import { AssetsService } from '../../common/services/assets.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    FileUploadModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [MenuController],
  providers: [MenuService, JwtAuthGuard, RolesGuard, AssetsService],
  exports: [MenuService],
})
export class MenuModule {}

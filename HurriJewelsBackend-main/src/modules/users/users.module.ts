import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RoleManagementController } from './role-management.controller';
import { RbacModule } from '../../common/rbac/rbac.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    forwardRef(() => RbacModule),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [UsersController, RoleManagementController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

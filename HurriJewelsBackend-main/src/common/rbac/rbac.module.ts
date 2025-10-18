import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from '../services/audit.service';
import { RoleCreationService } from '../services/role-creation.service';
import { RolesGuard } from '../guards/roles.guard';
import { OwnershipGuard } from '../guards/ownership.guard';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { UsersModule } from '../../modules/users/users.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => UsersModule)],
  providers: [
    AuditService,
    RoleCreationService,
    RolesGuard,
    OwnershipGuard,
    AuditInterceptor,
  ],
  exports: [
    AuditService,
    RoleCreationService,
    RolesGuard,
    OwnershipGuard,
    AuditInterceptor,
  ],
})
export class RbacModule {}

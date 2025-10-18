import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EngagementService } from './engagement.service';
import { EngagementController, NewsletterController } from './engagement.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule, JwtModule.register({})],
  controllers: [EngagementController, NewsletterController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}


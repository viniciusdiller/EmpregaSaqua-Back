import { Module } from '@nestjs/common';
import { JobAlertsService } from './job-alerts.service.js';
import { JobAlertsController } from './job-alerts.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [JobAlertsController],
  providers: [JobAlertsService],
  exports: [JobAlertsService],
})
export class JobAlertsModule {}

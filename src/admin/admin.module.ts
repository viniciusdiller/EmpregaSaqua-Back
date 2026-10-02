import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobAlertsModule } from '../job-alerts/job-alerts.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [PrismaModule, AuthModule, JobAlertsModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService, AdminBootstrapService]
})
export class AdminModule {}

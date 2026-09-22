import { Module } from '@nestjs/common';
import { AuditCleanupService } from './services/audit-cleanup.service.js';

@Module({
  providers: [AuditCleanupService],
})
export class AuditModule {}

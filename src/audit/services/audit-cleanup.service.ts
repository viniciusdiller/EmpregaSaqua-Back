import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from '../../prisma/db.js';

@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    this.logger.log('Iniciando limpeza de logs de auditoria antigos...');

    try {
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
      const fortyFiveDaysAgoStr = fortyFiveDaysAgo.toISOString();

      // Deleta todos os logs mais antigos que 45 dias
      const result = await db.orm.public.AuditLog.where((log) =>
        log.created_at.lt(fortyFiveDaysAgoStr)
      ).delete();

      this.logger.log(`Cleanup: logs antigos deletados com sucesso (limite: ${fortyFiveDaysAgoStr}).`);
    } catch (error) {
      this.logger.error(`Erro ao limpar logs de auditoria: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

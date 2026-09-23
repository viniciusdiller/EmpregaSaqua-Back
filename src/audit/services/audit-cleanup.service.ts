import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from '../../prisma/db.js';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    this.logger.log('Iniciando limpeza de logs de auditoria antigos e cold storage...');

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();

      // Retrieve all logs older than 90 days
      const oldLogs = await db.orm.public.AuditLog.where((log) =>
        log.created_at.lt(ninetyDaysAgoStr)
      ).all();

      if (oldLogs.length === 0) {
        this.logger.log('Nenhum log antigo para limpar.');
        return;
      }

      // Prepare backup directory
      const archiveDir = path.resolve(process.cwd(), 'archives', 'audit');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const today = new Date().toISOString().split('T')[0];
      const archivePath = path.join(archiveDir, `logs-${today}.json.gz`);

      // Write logs to a gzipped JSON file using Streams
      await this.archiveLogs(oldLogs, archivePath);

      // Only delete AFTER successful archival
      await db.orm.public.AuditLog.where((log) =>
        log.created_at.lt(ninetyDaysAgoStr)
      ).delete();

      this.logger.log(`Cleanup: ${oldLogs.length} logs arquivados e deletados com sucesso (limite: ${ninetyDaysAgoStr}).`);
    } catch (error) {
      this.logger.error(`Erro ao limpar logs de auditoria: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async archiveLogs(logs: any[], archivePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(archivePath);
      const gzip = zlib.createGzip();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
      gzip.on('error', (err) => reject(err));

      gzip.pipe(writeStream);

      // Write data as a JSON array string
      gzip.write(JSON.stringify(logs, null, 2));
      gzip.end();
    });
  }
}

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { CreateJobAlertDto } from './dtos/create-job-alert.dto.js';
import type { FieldOutputTypes } from '../prisma/contract.d.js';

type Job = FieldOutputTypes['public']['Job'];

const WORK_MODEL_LABELS: Record<string, string> = {
  ON_SITE: 'Presencial',
  HYBRID: 'Híbrido',
  REMOTE: 'Remoto',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  INTERNSHIP: 'Estágio',
  FREELANCE: 'Freelance',
  APPRENTICE: 'Aprendiz',
};

@Injectable()
export class JobAlertsService {
  private readonly logger = new Logger(JobAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(candidateId: string, data: CreateJobAlertDto) {
    return this.prisma.jobAlert.create({
      candidate_id: candidateId,
      keyword: data.keyword ?? null,
      address: data.address ?? null,
      work_model: data.work_model ?? null,
      contract_type: data.contract_type ?? null,
      is_pcd: data.is_pcd ?? false,
    });
  }

  async listMine(candidateId: string) {
    return this.prisma.jobAlert
      .where({ candidate_id: candidateId })
      .orderBy((a) => a.created_at.desc())
      .all();
  }

  async remove(candidateId: string, id: string) {
    const alert = await this.prisma.jobAlert.where({ id }).first();
    if (!alert) {
      throw new NotFoundException('Alerta não encontrado.');
    }
    if (alert.candidate_id !== candidateId) {
      throw new ForbiddenException('Você não tem permissão para remover este alerta.');
    }
    await this.prisma.jobAlert.where({ id }).delete();
  }

  /**
   * Disparado quando uma vaga vira ACTIVE. Critérios de cada alerta combinam em E; alerta sem
   * nenhum critério preenchido não casa com nada (evita mandar e-mail pra todo mundo à toa).
   */
  async notifyMatchingAlerts(job: Job) {
    const alerts = await this.prisma.jobAlert.where({}).all();
    const matching = alerts.filter((alert) => this.matches(alert, job));
    if (matching.length === 0) return;

    const candidateIds = [...new Set(matching.map((a) => a.candidate_id))];
    const candidates = await Promise.all(candidateIds.map((id) => this.prisma.user.where({ id }).first()));
    const emailById = new Map(candidates.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c.id, c.email]));

    const frontendUrl = process.env.FRONTEND_URL || 'https://empregasaqua.com';
    const jobMeta = `Modelo: ${WORK_MODEL_LABELS[job.work_model] ?? job.work_model} · Contrato: ${CONTRACT_TYPE_LABELS[job.contract_type] ?? job.contract_type}`;
    const html = await this.mail.renderTemplate('nova-vaga', {
      jobTitle: job.title,
      jobAddress: job.address || '',
      jobMeta,
      jobLink: `${frontendUrl}/vagas/${job.id}`,
      frontendUrl,
    });

    await Promise.all(
      matching.map(async (alert) => {
        const email = emailById.get(alert.candidate_id);
        if (!email) return;
        await this.mail.send(email, `Nova vaga: ${job.title}`, html);
      }),
    );
    this.logger.log(`Vaga ${job.id} notificada para ${matching.length} alerta(s).`);
  }

  private matches(
    alert: { keyword: string | null; address: string | null; work_model: string | null; contract_type: string | null; is_pcd: boolean },
    job: Job,
  ): boolean {
    if (!alert.keyword && !alert.address && !alert.work_model && !alert.contract_type && !alert.is_pcd) {
      return false;
    }
    if (alert.keyword && !job.title.toLowerCase().includes(alert.keyword.toLowerCase())) return false;
    if (alert.address && !job.address.toLowerCase().includes(alert.address.toLowerCase())) return false;
    if (alert.work_model && job.work_model !== alert.work_model) return false;
    if (alert.contract_type && job.contract_type !== alert.contract_type) return false;
    if (alert.is_pcd && !job.is_pcd) return false;
    return true;
  }
}

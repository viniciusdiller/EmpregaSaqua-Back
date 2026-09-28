import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { UpdateJobDto } from '../jobs/dtos/update-job.dto.js';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto.js';
import { JobAlertsService } from '../job-alerts/job-alerts.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobAlerts: JobAlertsService,
    private readonly mail: MailService,
  ) {}

  async approveCompany(companyId: string) {
    const company = await this.prisma.companyProfile.where({ id: companyId }).first();
    if (!company) {
      throw new NotFoundException('Company Profile not found');
    }

    const updated = await this.prisma.companyProfile.where({ id: companyId }).update({
      verification_status: 'APPROVED',
    });

    void this.sendCompanyApprovedEmail(company).catch(() => undefined);

    return updated;
  }

  async rejectCompany(companyId: string, reason?: string) {
    const company = await this.prisma.companyProfile.where({ id: companyId }).first();
    if (!company) {
      throw new NotFoundException('Company Profile not found');
    }

    const updated = await this.prisma.companyProfile.where({ id: companyId }).update({
      verification_status: 'REJECTED',
    });

    void this.sendCompanyRejectedEmail(company, reason).catch(() => undefined);

    return updated;
  }

  private async sendCompanyApprovedEmail(company: { user_id: string; nome_fantasia: string }) {
    const user = await this.prisma.user.where({ id: company.user_id }).first();
    if (!user) return;
    const frontendUrl = process.env.FRONTEND_URL || 'https://empregasaqua.com';
    const html = await this.mail.renderTemplate('empresa-aprovada', {
      companyName: company.nome_fantasia,
      ctaLink: `${frontendUrl}/empresa/vagas/nova`,
      frontendUrl,
    });
    await this.mail.send(user.email, 'Cadastro aprovado no EmpregaSaquá', html);
  }

  private async sendCompanyRejectedEmail(company: { user_id: string; nome_fantasia: string }, reason?: string) {
    const user = await this.prisma.user.where({ id: company.user_id }).first();
    if (!user) return;
    const frontendUrl = process.env.FRONTEND_URL || 'https://empregasaqua.com';
    const html = await this.mail.renderTemplate('empresa-reprovada', {
      companyName: company.nome_fantasia,
      reasonText: reason ? `Motivo: ${reason}` : '',
      supportEmail: process.env.SUPPORT_EMAIL || 'suporte@empregasaqua.com',
      frontendUrl,
    });
    await this.mail.send(user.email, 'Cadastro não aprovado no EmpregaSaquá', html);
  }

  async approveJob(jobId: string) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const updated = await this.prisma.job.where({ id: jobId }).update({
      status: 'ACTIVE',
    });

    // Notificação de alerta é best-effort: não pode derrubar a aprovação da vaga.
    if (updated) {
      void this.jobAlerts.notifyMatchingAlerts(updated).catch(() => undefined);
    }

    return updated;
  }

  async rejectJob(jobId: string) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.where({ id: jobId }).update({
      status: 'REJECTED',
    });
  }
  private meta(total: number, page: number, limit: number) {
    return { total_items: total, total_pages: Math.ceil(total / limit), current_page: page, per_page: limit };
  }

  async listJobs(page: number, limit: number, status?: string) {
    let base = this.prisma.job.where((j) => j.deleted_at.isNull());
    if (status) base = base.where({ status: status as any });
    const [data, c] = await Promise.all([
      base
        .include('employer', (e) => e.select('id').include('company_profile', (cp) => cp.select('nome_fantasia', 'logo_url')))
        .orderBy((j) => j.created_at.desc()).limit(limit).offset((page - 1) * limit).all(),
      base.aggregate((a) => ({ total: a.count() })),
    ]);
    return { data, meta: this.meta(c.total, page, limit) };
  }

  async listCompanies(page: number, limit: number, status?: string) {
    let base = this.prisma.companyProfile.where({});
    if (status) base = base.where({ verification_status: status as any });
    const [data, c] = await Promise.all([
      base.include('user', (u) => u.select('id', 'email')).orderBy((x) => x.created_at.desc()).limit(limit).offset((page - 1) * limit).all(),
      base.aggregate((a) => ({ total: a.count() })),
    ]);
    return { data, meta: this.meta(c.total, page, limit) };
  }

  async listUsers(page: number, limit: number, role?: string) {
    let base = this.prisma.user.where({});
    if (role) base = base.where({ role: role as any });
    const [data, c] = await Promise.all([
      base.select('id', 'email', 'role', 'created_at', 'deleted_at').orderBy((u) => u.created_at.desc()).limit(limit).offset((page - 1) * limit).all(),
      base.aggregate((a) => ({ total: a.count() })),
    ]);
    return { data, meta: this.meta(c.total, page, limit) };
  }

  async updateJob(jobId: string, data: UpdateJobDto) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) throw new NotFoundException('Job not found');

    const { questions, status, ...updateData } = data;
    return this.prisma.job.where({ id: jobId }).update({
      ...updateData,
      ...(status && { status }),
    });
  }

  async deleteJob(jobId: string) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.job.where({ id: jobId }).delete();
  }

  async updateUserRole(userId: string, data: UpdateUserRoleDto) {
    const user = await this.prisma.user.where({ id: userId }).first();
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.where({ id: userId }).update({
      role: data.role,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.where({ id: userId }).first();
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.where({ id: userId }).delete();
  }
}

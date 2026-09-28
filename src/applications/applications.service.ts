import { Injectable, Inject, Logger, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateApplicationDto } from './dtos/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dtos/update-application-status.dto.js';
import type { ApplicationsRepository } from './repositories/applications.repository.interface.js';
import { JobsService } from '../jobs/services/jobs.service.js';
import { ApplicationStatus, JobStatus } from '../prisma/db.js';
import { MatchScoringService } from './services/match-scoring.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: 'Enviada',
  REVIEWING: 'Em análise',
  INTERVIEW: 'Entrevista',
  HIRED: 'Contratado',
  REJECTED: 'Não selecionado',
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  APPLIED: '#0F6664',
  REVIEWING: '#0F6664',
  INTERVIEW: '#B8860B',
  HIRED: '#1E7A4C',
  REJECTED: '#8A3A3A',
};

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @Inject('IApplicationsRepository') private readonly repo: ApplicationsRepository,
    private readonly jobsService: JobsService,
    private readonly matchScoringService: MatchScoringService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async applyForJob(applicantId: string, jobId: string, data: CreateApplicationDto): Promise<any> {
    const job = await this.jobsService.getJobById(jobId) as any;
    
    // Check if job is still active
    if (job.status !== JobStatus.ACTIVE || job.deleted_at) {
      throw new ConflictException('Esta vaga não está mais aceitando candidaturas.');
    }
    if (job.expires_at && new Date(job.expires_at).getTime() < Date.now()) {
      throw new ConflictException('O prazo desta vaga terminou.');
    }

    const existingApplication = await this.repo.findByJobAndApplicant(jobId, applicantId);
    if (existingApplication) {
      throw new ConflictException('Você já se candidatou a esta vaga.');
    }

    let isKnockedOut = false;
    let initialStatus = ApplicationStatus.APPLIED;

    if (job.questions && job.questions.length > 0) {
      // Omitir as respostas não pula a triagem: toda pergunta precisa de resposta.
      const answers = data.answers ?? [];
      for (const question of job.questions) {
        const candidateAnswer = answers.find(a => a.question_id === question.id);
        if (!candidateAnswer) {
          throw new BadRequestException('Responda todas as perguntas da vaga.');
        }
        // Resposta diferente do gabarito = eliminado
        if (candidateAnswer.answer !== question.expected_answer) {
          isKnockedOut = true;
          initialStatus = ApplicationStatus.REJECTED;
          break;
        }
      }
    }

    return this.repo.create(applicantId, jobId, data, initialStatus, isKnockedOut);
  }

  async getMyApplications(applicantId: string): Promise<any> {
    return this.repo.findByApplicant(applicantId);
  }

  async getJobApplications(employerId: string, jobId: string) {
    const job = await this.jobsService.getJobById(jobId);
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Apenas o criador da vaga pode visualizar seus candidatos.');
    }
    
    const applications = await this.repo.findByJob(jobId);

    // Calculate match score for each application
    const applicationsWithScore = applications.map(app => {
      const candidateSkills = app.applicant?.candidate_profile?.skills || [];
      const jobRequirements = job.mandatory_qualifications || [];
      
      const matchScore = this.matchScoringService.calculateMatchScore(
        candidateSkills,
        [...jobRequirements]
      );

      // Return a new object that includes match_score without mutating the original Prisma object
      return {
        ...app,
        match_score: matchScore,
      };
    });

    // Sort descending by match_score
    applicationsWithScore.sort((a, b) => b.match_score - a.match_score);

    return applicationsWithScore;
  }

  async updateApplicationStatus(employerId: string, applicationId: string, data: UpdateApplicationStatusDto): Promise<any> {
    const application = await this.repo.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Candidatura não encontrada.');
    }

    const job = await this.jobsService.getJobById(application.job_id) as any;
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Apenas o criador da vaga pode modificar o status de uma candidatura.');
    }

    const updated = await this.repo.updateStatus(applicationId, data.status);

    // Best-effort: falha ao notificar o candidato não pode derrubar a mudança de status.
    this.sendStatusEmail(application.applicant_id, job, data.status).catch((err) =>
      this.logger.error(`Falha ao enviar e-mail de status para candidatura ${applicationId}: ${err instanceof Error ? err.message : String(err)}`),
    );

    return updated;
  }

  private async sendStatusEmail(applicantId: string, job: { title: string; employer?: { company_profile?: { nome_fantasia?: string } | null } }, status: ApplicationStatus) {
    const [candidate, profile] = await Promise.all([
      this.prisma.user.where({ id: applicantId }).first(),
      this.prisma.candidateProfile.where({ user_id: applicantId }).first(),
    ]);
    if (!candidate) return;

    const frontendUrl = process.env.FRONTEND_URL || 'https://empregasaqua.com';
    const html = await this.mail.renderTemplate('status-candidatura', {
      candidateName: profile?.full_name || 'Candidato',
      jobTitle: job.title,
      companyName: job.employer?.company_profile?.nome_fantasia || 'a empresa',
      statusLabel: STATUS_LABEL[status],
      statusColor: STATUS_COLOR[status],
      ctaLink: `${frontendUrl}/candidato/candidaturas`,
      frontendUrl,
    });
    await this.mail.send(candidate.email, `Atualização da sua candidatura: ${job.title}`, html);
  }

  async withdrawApplication(applicantId: string, applicationId: string): Promise<void> {
    const application = await this.repo.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Candidatura não encontrada.');
    }
    // IDOR protection: ensure the application belongs to the requesting user
    if (application.applicant_id !== applicantId) {
      throw new ForbiddenException('Você não tem permissão para retirar esta candidatura.');
    }

    await this.repo.delete(applicationId);
  }
}

import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { IJobsRepository } from '../repositories/jobs.repository.interface.js';
import { CreateJobDto } from '../dtos/create-job.dto.js';
import type { FindJobsQueryDto } from '../dtos/find-jobs-query.dto.js';
import type { PaginatedJobsResponse } from '../dtos/paginated-jobs-response.dto.js';
import type { Job } from '../../prisma/db.js';

@Injectable()
export class JobsService {
  constructor(
    @Inject('IJobsRepository') private readonly jobsRepo: IJobsRepository
  ) {}

  async createJob(employerId: string, data: CreateJobDto): Promise<Job> {
    return this.jobsRepo.create(employerId, data);
  }

  async getMyJobs(employerId: string, query: FindJobsQueryDto): Promise<PaginatedJobsResponse> {
    return this.jobsRepo.findByEmployer(employerId, query.page ?? 1, query.limit ?? 10, query.status);
  }

  async getPublicJobs(query: FindJobsQueryDto): Promise<PaginatedJobsResponse> {
    return this.jobsRepo.findAllPublic(query);
  }

  async deleteEmployerJob(employerId: string, jobId: string): Promise<void> {
    const job = await this.jobsRepo.findById(jobId);
    if (!job) {
      throw new NotFoundException('Vaga não encontrada');
    }
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Você não tem permissão para modificar esta vaga');
    }
    
    await this.jobsRepo.softDelete(jobId);
  }

  async getJobById(jobId: string): Promise<Job> {
    const job = await this.jobsRepo.findById(jobId);
    if (!job) {
      throw new NotFoundException('Vaga não encontrada');
    }
    return job;
  }

  /**
   * Leitura pública: só vagas ACTIVE e não removidas; dono e admin veem em qualquer status.
   * O gabarito das perguntas de triagem (expected_answer) nunca sai daqui.
   */
  async getJobForViewer(jobId: string, viewer: { id: string; role: string } | null): Promise<any> {
    const job = (await this.getJobById(jobId)) as any;
    const privileged = !!viewer && (viewer.role === 'ADMIN' || viewer.id === job.employer_id);
    if (!privileged && (job.status !== 'ACTIVE' || job.deleted_at)) {
      throw new NotFoundException('Vaga não encontrada');
    }
    return { ...job, questions: (job.questions ?? []).map((q: any) => ({ id: q.id, question_text: q.question_text })) };
  }

  async updateEmployerJob(employerId: string, jobId: string, data: any): Promise<Job> {
    const job = await this.jobsRepo.findById(jobId);
    if (!job) {
      throw new NotFoundException('Vaga não encontrada');
    }
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Você não tem permissão para modificar esta vaga');
    }
    
    // Status can only be changed by Admin via AdminController, so we remove it here to be safe
    const { status, ...safeData } = data;

    // Vaga ativa editada volta para análise: senão a moderação seria burlada.
    const nextStatus = job.status === 'ACTIVE' ? { status: 'PENDING' } : {};
    return this.jobsRepo.update(jobId, { ...safeData, ...nextStatus });
  }
}


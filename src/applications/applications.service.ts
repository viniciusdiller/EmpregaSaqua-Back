import { Injectable, Inject, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateApplicationDto } from './dtos/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dtos/update-application-status.dto.js';
import { ApplicationsRepository } from './repositories/applications.repository.interface.js';
import { JobsService } from '../jobs/services/jobs.service.js';
import { ApplicationStatus, JobStatus } from '../prisma/db.js';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject('IApplicationsRepository') private readonly repo: ApplicationsRepository,
    private readonly jobsService: JobsService,
  ) {}

  async applyForJob(applicantId: string, jobId: string, data: CreateApplicationDto) {
    const job = await this.jobsService.getJobById(jobId);
    
    // Check if job is still active
    if (job.status !== JobStatus.ACTIVE && job.status !== JobStatus.PENDING) {
      throw new ConflictException('Esta vaga não está mais aceitando candidaturas.');
    }

    const existingApplication = await this.repo.findByJobAndApplicant(jobId, applicantId);
    if (existingApplication) {
      throw new ConflictException('Você já se candidatou a esta vaga.');
    }

    return this.repo.create(applicantId, jobId, data);
  }

  async getMyApplications(applicantId: string) {
    return this.repo.findByApplicant(applicantId);
  }

  async getJobApplications(employerId: string, jobId: string) {
    const job = await this.jobsService.getJobById(jobId);
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Apenas o criador da vaga pode visualizar seus candidatos.');
    }
    return this.repo.findByJob(jobId);
  }

  async updateApplicationStatus(employerId: string, applicationId: string, data: UpdateApplicationStatusDto) {
    const application = await this.repo.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Candidatura não encontrada.');
    }

    const job = await this.jobsService.getJobById(application.job_id);
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Apenas o criador da vaga pode modificar o status de uma candidatura.');
    }

    return this.repo.updateStatus(applicationId, data.status);
  }
}

import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { IJobsRepository } from '../repositories/jobs.repository.interface.js';
import { CreateJobDto } from '../dtos/create-job.dto';
import { Job } from '../entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @Inject('IJobsRepository') private readonly jobsRepo: IJobsRepository
  ) {}

  async createJob(employerId: string, data: CreateJobDto): Promise<Job> {
    return this.jobsRepo.create(employerId, data);
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
}

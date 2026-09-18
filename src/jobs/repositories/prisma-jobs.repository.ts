import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { IJobsRepository } from './jobs.repository.interface.js';
import { Job } from '../entities/job.entity.js';
import { CreateJobDto } from '../dtos/create-job.dto.js';
import { JobStatus } from '../../prisma/db.js';

@Injectable()
export class PrismaJobsRepository implements IJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(employerId: string, data: CreateJobDto): Promise<Job> {
    const jobRow = await this.prisma.job.create({
      employer_id: employerId,
      company_name: data.company_name,
      title: data.title,
      description: data.description,
      location: data.location,
      contact_whatsapp: data.contact_whatsapp ?? null,
      contact_email: data.contact_email ?? null,
      status: JobStatus.PENDING,
    });
    
    return jobRow as Job;
  }

  async findById(id: string): Promise<Job | null> {
    const jobRow = await this.prisma.job.where({ id }).first();
    return jobRow ? jobRow : null;
  }

  async findAllPublic(page: number, limit: number, search?: string): Promise<Job[]> {
    let query = this.prisma.job.where({ status: JobStatus.ACTIVE });
    
    if (search) {
      query = query.where((j) => j.title.ilike(`%${search}%`));
    }
    
    const jobs = await query
      .orderBy((j) => j.created_at.desc())
      .limit(limit)
      .offset((page - 1) * limit)
      .all();
      
    return jobs;
  }

  async updateStatus(id: string, status: string): Promise<Job> {
    const updated = await this.prisma.job.where({ id }).update({
      status: status as JobStatus,
      updated_at: new Date().toISOString()
    });
    if (!updated) {
      throw new Error('Job not found');
    }
    return updated as Job;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.job.where({ id }).update({
      deleted_at: new Date().toISOString(),
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { IJobsRepository } from './jobs.repository.interface.js';
import type { Job } from '../../prisma/db.js';
import { JobStatus } from '../../prisma/db.js';
import type { CreateJobDto } from '../dtos/create-job.dto.js';
import type { UpdateJobDto } from '../dtos/update-job.dto.js';
import type { FindJobsQueryDto } from '../dtos/find-jobs-query.dto.js';
import type { PaginatedJobsResponse } from '../dtos/paginated-jobs-response.dto.js';

@Injectable()
export class PrismaJobsRepository implements IJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(employerId: string, data: CreateJobDto): Promise<Job> {
    const jobRow = await this.prisma.job.create({
      employer_id: employerId,
      title: data.title,
      description: data.description,
      address: data.address,
      work_schedule: data.work_schedule,
      salary_range: data.salary_range ?? null,
      mandatory_qualifications: data.mandatory_qualifications,
      differential_qualifications: data.differential_qualifications,
      benefits: data.benefits,
      contact_whatsapp: data.contact_whatsapp ?? null,
      contact_email: data.contact_email ?? null,
      status: JobStatus.PENDING,
    });
    
    if (data.questions && data.questions.length > 0) {
      for (const q of data.questions) {
        await this.prisma.jobQuestion.create({
          job_id: jobRow.id,
          question_text: q.question_text,
          expected_answer: q.expected_answer,
        });
      }
    }

    return jobRow as Job;
  }

  async findById(id: string): Promise<Job | null> {
    const jobRow = await this.prisma.job
      .where({ id })
      .include('employer', (e) => e.include('company_profile'))
      .include('questions', (q) => q.select('id', 'question_text', 'expected_answer'))
      .first();
    return jobRow as unknown as Job | null;
  }

  async findAllPublic(query: FindJobsQueryDto): Promise<PaginatedJobsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    // Default to ACTIVE jobs; allow ADMIN to request specific statuses via query
    const statusFilter = query.status ?? JobStatus.ACTIVE;

    // Build a base collection with the mandatory status filter and soft-delete exclusion
    let baseQuery = this.prisma.job
      .where({ status: statusFilter })
      .where((j) => j.deleted_at.isNull());

    // Dynamic filter: address (case-insensitive partial match)
    if (query.address) {
      baseQuery = baseQuery.where((j) => j.address.ilike(`%${query.address}%`));
    }

    // Dynamic filter: title (case-insensitive partial match)
    if (query.title_like) {
      baseQuery = baseQuery.where((j) => j.title.ilike(`%${query.title_like}%`));
    }

    // Execute both queries in parallel: data page + count
    const [jobs, countResult] = await Promise.all([
      baseQuery
        .include('employer', (e) => 
          e.select('id')
           .include('company_profile', (cp) => 
             cp.select('nome_fantasia', 'logo_url')
           )
        )
        .include('questions', (q) => q.select('id', 'question_text', 'expected_answer'))
        .orderBy((j) => j.created_at.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      baseQuery.aggregate((a) => ({ total: a.count() })),
    ]);

    const total_items = countResult.total;
    const total_pages = Math.ceil(total_items / limit);

    return {
      data: jobs as Job[],
      meta: {
        total_items,
        total_pages,
        current_page: page,
        per_page: limit,
      },
    };
  }

  async updateStatus(id: string, status: string): Promise<Job> {
    const updated = await this.prisma.job.where({ id }).update({
      status: status as JobStatus,
      updated_at: new Date().toISOString(),
    });
    if (!updated) {
      throw new Error('Job not found');
    }
    return updated as Job;
  }

  async update(id: string, data: UpdateJobDto): Promise<Job> {
    const { questions, status, ...updateData } = data;
    
    // We update the basic job fields
    const updated = await this.prisma.job.where({ id }).update({
      ...updateData,
      ...(status && { status }),
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new Error('Job not found');
    }

    // If new knockout questions are provided, we replace the old ones
    if (questions) {
      await this.prisma.jobQuestion.where({ job_id: id }).delete();
      for (const q of questions) {
        await this.prisma.jobQuestion.create({
          job_id: id,
          question_text: q.question_text,
          expected_answer: q.expected_answer,
        });
      }
    }

    return updated as Job;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.job.where({ id }).update({
      deleted_at: new Date().toISOString(),
    });
  }
}

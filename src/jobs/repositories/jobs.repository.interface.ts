import type { Job } from '../../prisma/db.js';
import type { CreateJobDto } from '../dtos/create-job.dto.js';
import type { UpdateJobDto } from '../dtos/update-job.dto.js';
import type { FindJobsQueryDto } from '../dtos/find-jobs-query.dto.js';
import type { PaginatedJobsResponse } from '../dtos/paginated-jobs-response.dto.js';

export interface IJobsRepository {
  create(employerId: string, data: CreateJobDto): Promise<Job>;
  findAllPublic(query: FindJobsQueryDto): Promise<PaginatedJobsResponse>;
  findById(id: string): Promise<Job | null>;
  softDelete(id: string): Promise<void>;
  updateStatus(id: string, status: string): Promise<Job>;
  update(id: string, data: UpdateJobDto): Promise<Job>;
}

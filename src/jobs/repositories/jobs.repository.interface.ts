import { Job } from '../entities/job.entity';
import { CreateJobDto } from '../dtos/create-job.dto';

export interface IJobsRepository {
  create(employerId: string, data: CreateJobDto): Promise<Job>;
  findAllPublic(page: number, limit: number, search?: string): Promise<Job[]>;
  findById(id: string): Promise<Job | null>;
  softDelete(id: string): Promise<void>;
  updateStatus(id: string, status: string): Promise<Job>;
}

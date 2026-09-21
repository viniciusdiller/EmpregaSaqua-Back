import { Application, ApplicationStatus } from '../../prisma/db.js';
import { CreateApplicationDto } from '../dtos/create-application.dto.js';

export interface ApplicationsRepository {
  create(applicantId: string, jobId: string, data: CreateApplicationDto): Promise<Application>;
  findByJobAndApplicant(jobId: string, applicantId: string): Promise<Application | null>;
  findByJob(jobId: string): Promise<any[]>;
  findByApplicant(applicantId: string): Promise<Application[]>;
  updateStatus(applicationId: string, status: ApplicationStatus): Promise<Application>;
  findById(applicationId: string): Promise<Application | null>;
}

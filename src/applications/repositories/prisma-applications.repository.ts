import { Injectable } from '@nestjs/common';
import { Application, ApplicationStatus } from '../../prisma/db.js';
import { ApplicationsRepository } from './applications.repository.interface.js';
import { CreateApplicationDto } from '../dtos/create-application.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PrismaApplicationsRepository implements ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(applicantId: string, jobId: string, data: CreateApplicationDto, status?: ApplicationStatus, isKnockedOut?: boolean): Promise<Application> {
    const app = await this.prisma.application.create({
      applicant_id: applicantId,
      job_id: jobId,
      cover_letter: data.cover_letter ?? null,
      resume_url: data.resume_url ?? null,
      status: status ?? ApplicationStatus.APPLIED,
      is_knocked_out: isKnockedOut ?? false,
    });

    if (data.answers && data.answers.length > 0) {
      for (const answer of data.answers) {
        await this.prisma.applicationAnswer.create({
          application_id: app.id,
          question_id: answer.question_id,
          answer: answer.answer,
        });
      }
    }

    return app as Application;
  }

  async findByJobAndApplicant(jobId: string, applicantId: string): Promise<Application | null> {
    return await this.prisma.application.where({
      job_id: jobId,
      applicant_id: applicantId,
    }).first();
  }

  async findByJob(jobId: string): Promise<any[]> {
    return await this.prisma.application
      .where({ job_id: jobId })
      .include('applicant', (a) => a.include('candidate_profile'))
      .all();
  }

  async findByApplicant(applicantId: string): Promise<Application[]> {
    return await this.prisma.application.where({
      applicant_id: applicantId,
    }).all();
  }

  async updateStatus(applicationId: string, status: ApplicationStatus): Promise<Application> {
    const updated = await this.prisma.application.where({ id: applicationId }).update({
      status,
    });
    return updated as Application;
  }

  async findById(applicationId: string): Promise<Application | null> {
    return await this.prisma.application.where({ id: applicationId }).first();
  }

  async delete(applicationId: string): Promise<void> {
    await this.prisma.application.where({ id: applicationId }).delete();
  }
}

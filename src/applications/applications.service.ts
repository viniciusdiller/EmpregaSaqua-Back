import { Injectable, Inject, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateApplicationDto } from './dtos/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dtos/update-application-status.dto.js';
import type { ApplicationsRepository } from './repositories/applications.repository.interface.js';
import { JobsService } from '../jobs/services/jobs.service.js';
import { ApplicationStatus, JobStatus } from '../prisma/db.js';
import { MatchScoringService } from './services/match-scoring.service.js';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject('IApplicationsRepository') private readonly repo: ApplicationsRepository,
    private readonly jobsService: JobsService,
    private readonly matchScoringService: MatchScoringService,
  ) {}

  async applyForJob(applicantId: string, jobId: string, data: CreateApplicationDto): Promise<any> {
    const job = await this.jobsService.getJobById(jobId) as any;
    
    // Check if job is still active
    if (job.status !== JobStatus.ACTIVE && job.status !== JobStatus.PENDING) {
      throw new ConflictException('Esta vaga não está mais aceitando candidaturas.');
    }

    const existingApplication = await this.repo.findByJobAndApplicant(jobId, applicantId);
    if (existingApplication) {
      throw new ConflictException('Você já se candidatou a esta vaga.');
    }

    let isKnockedOut = false;
    let initialStatus = ApplicationStatus.PENDING;

    if (job.questions && job.questions.length > 0 && data.answers) {
      for (const question of job.questions) {
        const candidateAnswer = data.answers.find(a => a.question_id === question.id);
        // If answer is missing or incorrect, it's a knockout
        if (!candidateAnswer || candidateAnswer.answer !== question.expected_answer) {
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

    const job = await this.jobsService.getJobById(application.job_id);
    if (job.employer_id !== employerId) {
      throw new ForbiddenException('Apenas o criador da vaga pode modificar o status de uma candidatura.');
    }

    return this.repo.updateStatus(applicationId, data.status);
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

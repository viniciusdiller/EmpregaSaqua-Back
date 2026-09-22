import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ApplicationsService } from './applications.service.js';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, JobStatus } from '../prisma/db.js';
import { JobsService } from '../jobs/services/jobs.service.js';
import { MatchScoringService } from './services/match-scoring.service.js';
import type { ApplicationsRepository } from './repositories/applications.repository.interface.js';

const makeJob = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  employer_id: 'employer-1',
  title: 'Dev',
  description: 'desc',
  location: 'Saquarema',
  company_name: 'Acme',
  contact_email: null,
  contact_whatsapp: null,
  status: JobStatus.ACTIVE,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  ...overrides,
});

const makeApplication = (overrides: Record<string, unknown> = {}) => ({
  id: 'app-1',
  job_id: 'job-1',
  applicant_id: 'seeker-1',
  cover_letter: null,
  resume_url: null,
  status: ApplicationStatus.APPLIED,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repo: jest.Mocked<ApplicationsRepository>;
  let jobsService: jest.Mocked<JobsService>;

  const mockRepo = {
    create: vi.fn(),
    findByJobAndApplicant: vi.fn(),
    findByJob: vi.fn(),
    findByApplicant: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
  };

  const mockJobsService = {
    getJobById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: 'IApplicationsRepository', useValue: mockRepo },
        { provide: JobsService, useValue: mockJobsService },
        { provide: MatchScoringService, useValue: { calculateMatchScore: vi.fn() } },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    repo = module.get('IApplicationsRepository');
    jobsService = module.get(JobsService);
    vi.clearAllMocks();
  });

  // ─── applyForJob ─────────────────────────────────────────────────────────────

  describe('applyForJob', () => {
    it('should create an application for an active job', async () => {
      const job = makeJob();
      const application = makeApplication();
      jobsService.getJobById.mockResolvedValue(job as any);
      repo.findByJobAndApplicant.mockResolvedValue(null);
      repo.create.mockResolvedValue(application as any);

      const result = await service.applyForJob('seeker-1', 'job-1', {});

      expect(repo.create).toHaveBeenCalledWith('seeker-1', 'job-1', {}, ApplicationStatus.APPLIED, false);
      expect(result).toEqual(application);
    });

    it('should throw ConflictException when applicant already applied', async () => {
      jobsService.getJobById.mockResolvedValue(makeJob() as any);
      repo.findByJobAndApplicant.mockResolvedValue(makeApplication() as any);

      await expect(service.applyForJob('seeker-1', 'job-1', {})).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when job is FILLED', async () => {
      jobsService.getJobById.mockResolvedValue(makeJob({ status: JobStatus.FILLED }) as any);

      await expect(service.applyForJob('seeker-1', 'job-1', {})).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when job is REJECTED', async () => {
      jobsService.getJobById.mockResolvedValue(makeJob({ status: JobStatus.REJECTED }) as any);

      await expect(service.applyForJob('seeker-1', 'job-1', {})).rejects.toThrow(ConflictException);
    });
  });

  // ─── getMyApplications ───────────────────────────────────────────────────────

  describe('getMyApplications', () => {
    it('should return all applications for the given applicant', async () => {
      const apps = [makeApplication()];
      repo.findByApplicant.mockResolvedValue(apps as any);

      const result = await service.getMyApplications('seeker-1');

      expect(repo.findByApplicant).toHaveBeenCalledWith('seeker-1');
      expect(result).toEqual(apps);
    });
  });

  // ─── getJobApplications ───────────────────────────────────────────────────────

  describe('getJobApplications', () => {
    it('should return applications for employer who owns the job', async () => {
      const job = makeJob({ employer_id: 'employer-1' });
      const apps = [makeApplication()];
      jobsService.getJobById.mockResolvedValue(job as any);
      repo.findByJob.mockResolvedValue(apps as any);

      const result = await service.getJobApplications('employer-1', 'job-1');

      expect(result).toEqual(apps);
    });

    it('should throw ForbiddenException on IDOR attempt (employer does not own job)', async () => {
      jobsService.getJobById.mockResolvedValue(makeJob({ employer_id: 'employer-2' }) as any);

      await expect(service.getJobApplications('employer-1', 'job-1')).rejects.toThrow(ForbiddenException);
      expect(repo.findByJob).not.toHaveBeenCalled();
    });
  });

  // ─── updateApplicationStatus ─────────────────────────────────────────────────

  describe('updateApplicationStatus', () => {
    it('should update status when employer owns the job', async () => {
      const app = makeApplication();
      const updatedApp = makeApplication({ status: ApplicationStatus.HIRED });
      repo.findById.mockResolvedValue(app as any);
      jobsService.getJobById.mockResolvedValue(makeJob({ employer_id: 'employer-1' }) as any);
      repo.updateStatus.mockResolvedValue(updatedApp as any);

      const result = await service.updateApplicationStatus('employer-1', 'app-1', {
        status: ApplicationStatus.HIRED,
      });

      expect(repo.updateStatus).toHaveBeenCalledWith('app-1', ApplicationStatus.HIRED);
      expect(result.status).toBe(ApplicationStatus.HIRED);
    });

    it('should throw NotFoundException when application does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.updateApplicationStatus('employer-1', 'ghost', { status: ApplicationStatus.HIRED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on IDOR attempt (employer does not own job)', async () => {
      repo.findById.mockResolvedValue(makeApplication() as any);
      jobsService.getJobById.mockResolvedValue(makeJob({ employer_id: 'employer-2' }) as any);

      await expect(
        service.updateApplicationStatus('employer-1', 'app-1', { status: ApplicationStatus.REJECTED }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });
  });
});

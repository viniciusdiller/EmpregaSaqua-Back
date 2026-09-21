import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JobsService } from './jobs.service.js';
import type { IJobsRepository } from '../repositories/jobs.repository.interface.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobStatus } from '../../prisma/db.js';
import type { FindJobsQueryDto } from '../dtos/find-jobs-query.dto.js';
import type { PaginatedJobsResponse } from '../dtos/paginated-jobs-response.dto.js';

const makeJob = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'job-id',
  employer_id: 'employer-id',
  title: 'Test Job',
  description: 'Test Description',
  address: 'Test Address',
  work_schedule: 'Test Schedule',
  salary_range: '1000-2000',
  mandatory_qualifications: ['Test Qual'],
  differential_qualifications: ['Diff Qual'],
  benefits: ['Test Benefit'],
  contact_whatsapp: '1234567890',
  contact_email: 'test@example.com',
  status: JobStatus.PENDING,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  ...overrides,
});

describe('JobsService', () => {
  let service: JobsService;
  let repo: jest.Mocked<IJobsRepository>;

  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findAllPublic: vi.fn(),
    softDelete: vi.fn(),
    updateStatus: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: 'IJobsRepository', useValue: mockRepo },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    repo = module.get('IJobsRepository');
    vi.clearAllMocks();
  });

  // ─── createJob ────────────────────────────────────────────────────────────────

  describe('createJob', () => {
    it('should delegate to repository and return the job', async () => {
      const job = makeJob();
      repo.create.mockResolvedValue(job as any);

      const result = await service.createJob('user-1', {
        company_name: 'Acme',
        title: 'Dev',
        description: 'desc',
        location: 'Saquarema',
      });

      expect(repo.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: 'Dev' }));
      expect(result).toEqual(job);
    });
  });

  // ─── getPublicJobs ────────────────────────────────────────────────────────────

  describe('getPublicJobs', () => {
    it('should return paginated result from repository', async () => {
      const query: FindJobsQueryDto = { page: 1, limit: 5 };
      const paginated: PaginatedJobsResponse = {
        data: [makeJob() as any],
        meta: { total_items: 1, total_pages: 1, current_page: 1, per_page: 5 },
      };
      repo.findAllPublic.mockResolvedValue(paginated);

      const result = await service.getPublicJobs(query);

      expect(repo.findAllPublic).toHaveBeenCalledWith(query);
      expect(result.meta.total_items).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should return empty data with correct meta when no jobs match', async () => {
      const query: FindJobsQueryDto = { page: 1, limit: 10, title_like: 'nonexistent' };
      const paginated: PaginatedJobsResponse = {
        data: [],
        meta: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 },
      };
      repo.findAllPublic.mockResolvedValue(paginated);

      const result = await service.getPublicJobs(query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total_pages).toBe(0);
    });
  });

  // ─── getJobById ───────────────────────────────────────────────────────────────

  describe('getJobById', () => {
    it('should return the job when found', async () => {
      const job = makeJob();
      repo.findById.mockResolvedValue(job as any);

      const result = await service.getJobById('job-1');
      expect(result).toEqual(job);
    });

    it('should throw NotFoundException when job does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getJobById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteEmployerJob ────────────────────────────────────────────────────────

  describe('deleteEmployerJob', () => {
    it('should soft-delete when employer owns the job', async () => {
      const job = makeJob({ employer_id: 'user-1' });
      repo.findById.mockResolvedValue(job as any);
      repo.softDelete.mockResolvedValue(undefined);

      await service.deleteEmployerJob('user-1', 'job-1');

      expect(repo.softDelete).toHaveBeenCalledWith('job-1');
    });

    it('should throw NotFoundException when job does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.deleteEmployerJob('user-1', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on IDOR attempt (different employer)', async () => {
      const job = makeJob({ employer_id: 'user-2' });
      repo.findById.mockResolvedValue(job as any);

      await expect(service.deleteEmployerJob('user-1', 'job-1')).rejects.toThrow(ForbiddenException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});

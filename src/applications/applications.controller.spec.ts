import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ApplicationStatus } from '../prisma/db.js';

const makeReq = (userId: string) => ({ user: { id: userId } });

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: Record<string, ReturnType<typeof vi.fn>>;

  const mockService = {
    applyForJob: vi.fn(),
    getMyApplications: vi.fn(),
    getJobApplications: vi.fn(),
    updateApplicationStatus: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [{ provide: ApplicationsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
    service = mockService;
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /jobs/:id/applications', () => {
    it('should call applyForJob with correct args', async () => {
      service.applyForJob.mockResolvedValue({ id: 'app-1' });

      const req = makeReq('seeker-1');
      await controller.applyForJob('job-1', { cover_letter: 'Hello' } as any, req as any);

      expect(service.applyForJob).toHaveBeenCalledWith('seeker-1', 'job-1', { cover_letter: 'Hello' });
    });
  });

  describe('GET /applications', () => {
    it('should return applicant own applications', async () => {
      const apps = [{ id: 'app-1' }];
      service.getMyApplications.mockResolvedValue(apps);

      const req = makeReq('seeker-1');
      const result = await controller.getMyApplications(req as any);

      expect(service.getMyApplications).toHaveBeenCalledWith('seeker-1');
      expect(result).toEqual(apps);
    });
  });

  describe('PATCH /applications/:id/status', () => {
    it('should call updateApplicationStatus with correct args', async () => {
      const updated = { id: 'app-1', status: ApplicationStatus.HIRED };
      service.updateApplicationStatus.mockResolvedValue(updated);

      const req = makeReq('employer-1');
      const result = await controller.updateApplicationStatus('app-1', { status: ApplicationStatus.HIRED } as any, req as any);

      expect(service.updateApplicationStatus).toHaveBeenCalledWith(
        'employer-1', 'app-1', { status: ApplicationStatus.HIRED },
      );
      expect(result.status).toBe(ApplicationStatus.HIRED);
    });
  });
});

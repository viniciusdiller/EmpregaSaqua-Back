import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { IJobsRepository } from '../repositories/jobs.repository.interface';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';

describe('JobsService', () => {
  let service: JobsService;
  let repo: jest.Mocked<IJobsRepository>;

  const mockRepo = {
    findById: jest.fn(),
    softDelete: jest.fn(),
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
  });

  it('should throw ForbiddenException if employer tries to delete another employer\'s job (IDOR test)', async () => {
    // Arrange
    const employerId = 'user-1';
    const otherEmployerId = 'user-2';
    const jobId = 'job-1';
    
    repo.findById.mockResolvedValue({
      id: jobId,
      employer_id: otherEmployerId,
      company_name: 'Test',
      title: 'Test',
      description: 'Test',
      location: 'Test',
      contact_email: null,
      contact_whatsapp: null,
      status: JobStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    // Act & Assert
    await expect(service.deleteEmployerJob(employerId, jobId)).rejects.toThrow(ForbiddenException);
  });
});

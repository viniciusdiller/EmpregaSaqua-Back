import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { vi } from 'vitest';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            user: { aggregate: vi.fn() },
            companyProfile: { aggregate: vi.fn() },
            job: { where: vi.fn().mockReturnThis(), aggregate: vi.fn(), project: vi.fn().mockReturnThis(), all: vi.fn() },
            application: { where: vi.fn().mockReturnThis(), aggregate: vi.fn(), groupBy: vi.fn().mockReturnThis(), all: vi.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesService } from '../services/candidates.service.js';
import { PdfService } from '../../pdf/services/pdf.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';

const makeReq = (userId: string) => ({ user: { id: userId } });

describe('CandidatesController', () => {
  let controller: CandidatesController;
  let candidatesService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const mockCandidatesService = { getMyProfile: vi.fn(), searchCandidates: vi.fn(), updateMyProfile: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatesController],
      providers: [
        { provide: CandidatesService, useValue: mockCandidatesService },
        { provide: PdfService, useValue: { buildResumeStream: vi.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CandidatesController>(CandidatesController);
    candidatesService = mockCandidatesService;
  });

  describe('GET /candidates/me', () => {
    it('returns the candidate profile of the authenticated user', async () => {
      const profile = { id: 'cand-1', user_id: 'user-1', full_name: 'Joana da Silva' };
      candidatesService.getMyProfile.mockResolvedValue(profile);

      const result = await controller.getMyProfile(makeReq('user-1') as any);

      expect(candidatesService.getMyProfile).toHaveBeenCalledWith('user-1');
      expect(result).toBe(profile);
    });

    it('throws NotFoundException when the candidate has no profile row', async () => {
      candidatesService.getMyProfile.mockResolvedValue(null);
      await expect(controller.getMyProfile(makeReq('user-1') as any)).rejects.toThrow(NotFoundException);
    });
  });
});

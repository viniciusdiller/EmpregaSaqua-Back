import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const makeReq = (userId: string) => ({ user: { id: userId } });

describe('UsersController', () => {
  let controller: UsersController;
  let service: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const mockService = { getMyCompanyProfile: vi.fn(), updateCompanyProfile: vi.fn(), requestAccountDeletion: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = mockService;
  });

  describe('GET /users/company-profile', () => {
    it('returns the company profile of the authenticated employer', async () => {
      const profile = { id: 'comp-1', user_id: 'user-1', nome_fantasia: 'Mercado Bom Preço' };
      service.getMyCompanyProfile.mockResolvedValue(profile);

      const result = await controller.getCompanyProfile(makeReq('user-1'));

      expect(service.getMyCompanyProfile).toHaveBeenCalledWith('user-1');
      expect(result).toBe(profile);
    });

    it('throws NotFoundException when the employer has no company profile row', async () => {
      service.getMyCompanyProfile.mockResolvedValue(null);
      await expect(controller.getCompanyProfile(makeReq('user-1'))).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /users/account/request-deletion', () => {
    it('delegates to the service with the authenticated user id', async () => {
      const message = { message: 'Enviamos um e-mail de confirmação.' };
      service.requestAccountDeletion.mockResolvedValue(message);

      const result = await controller.requestAccountDeletion(makeReq('user-1'));

      expect(service.requestAccountDeletion).toHaveBeenCalledWith('user-1');
      expect(result).toBe(message);
    });
  });
});

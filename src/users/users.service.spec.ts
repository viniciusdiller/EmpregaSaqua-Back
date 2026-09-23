import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { db } from '../prisma/db.js';
import { vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deleteAccount', () => {
    it('should throw NotFoundException if user is not found', async () => {
      vi.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.deleteAccount('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should anonymize data via transaction (LGPD)', async () => {
      // Mock findById to pass the user check
      vi.spyOn(service, 'findById').mockResolvedValue({ id: 'user-id-123', email: 'test@test.com' } as any);

      const userUpdateMock = vi.fn().mockResolvedValue({});
      const companyUpdateMock = vi.fn().mockResolvedValue({});
      const candidateUpdateMock = vi.fn().mockResolvedValue({});

      const txMock = {
        orm: {
          public: {
            User: {
              where: vi.fn().mockReturnValue({ update: userUpdateMock }),
            },
            CompanyProfile: {
              where: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({ id: 'comp-123' }),
                update: companyUpdateMock,
              }),
            },
            CandidateProfile: {
              where: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({ id: 'cand-123' }),
                update: candidateUpdateMock,
              }),
            },
          },
        },
      };

      vi.spyOn(db, 'transaction').mockImplementation(async (cb) => {
        return (cb as any)(txMock);
      });

      const result = await service.deleteAccount('user-id-123');

      expect(result.message).toBe('Conta excluída (anonimizada) com sucesso.');

      // Check if the user was updated with a fake email and deleted_at
      expect(txMock.orm.public.User.where).toHaveBeenCalledWith({ id: 'user-id-123' });
      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringMatching(/^anon_.*@deleted\.local$/),
          password_hash: '',
          deleted_at: expect.any(String),
        }),
      );

      // Check CompanyProfile anonymization
      expect(txMock.orm.public.CompanyProfile.where).toHaveBeenCalledWith({ id: 'comp-123' });
      expect(companyUpdateMock).toHaveBeenCalledWith({
        nome_fantasia: 'Usuário Anonimizado',
        cnpj: null,
        endereco: null,
        logo_url: null,
        verification_document_url: null,
      });

      // Check CandidateProfile anonymization
      expect(txMock.orm.public.CandidateProfile.where).toHaveBeenCalledWith({ id: 'cand-123' });
      expect(candidateUpdateMock).toHaveBeenCalledWith({
        bio: null,
        telefone: null,
        habilidades: null,
        skills: [],
        address: null,
      });
    });
  });
});

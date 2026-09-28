import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { db } from '../prisma/db.js';
import { vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../prisma/db.js';

describe('UsersService', () => {
  let service: UsersService;
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mail = { send: vi.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: MailService,
          useValue: mail,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    function mockTx(userCreateMock: ReturnType<typeof vi.fn>, companyCreateMock: ReturnType<typeof vi.fn>, candidateCreateMock: ReturnType<typeof vi.fn>) {
      const txMock = {
        orm: {
          public: {
            User: { create: userCreateMock },
            CompanyProfile: { create: companyCreateMock },
            CandidateProfile: { create: candidateCreateMock },
          },
        },
      };
      vi.spyOn(db, 'transaction').mockImplementation(async (cb) => (cb as any)(txMock));
      return txMock;
    }

    it('throws ConflictException when the email is already in use', async () => {
      vi.spyOn(service, 'findByEmail').mockResolvedValue({ id: 'existing' } as any);
      await expect(service.create({ email: 'a@a.com', password: 'password1' } as any)).rejects.toThrow('Email já está em uso');
    });

    it('creates a CompanyProfile in the same transaction for an EMPLOYER', async () => {
      vi.spyOn(service, 'findByEmail').mockResolvedValue(null);
      const userCreateMock = vi.fn().mockResolvedValue({ id: 'user-1', role: Role.EMPLOYER, email: 'rh@empresa.com' });
      const companyCreateMock = vi.fn().mockResolvedValue({});
      const candidateCreateMock = vi.fn().mockResolvedValue({});
      mockTx(userCreateMock, companyCreateMock, candidateCreateMock);

      await service.create({
        email: 'rh@empresa.com',
        password: 'password1',
        role: Role.EMPLOYER,
        nome_fantasia: 'Mercado Bom Preço',
        cnpj: '12345678000190',
        endereco: 'Centro, Saquarema',
        telefone: '22999998888',
      } as any);

      expect(companyCreateMock).toHaveBeenCalledWith({
        user_id: 'user-1',
        nome_fantasia: 'Mercado Bom Preço',
        cnpj: '12345678000190',
        endereco: 'Centro, Saquarema',
        telefone: '22999998888',
      });
      expect(candidateCreateMock).not.toHaveBeenCalled();
    });

    it('creates a CandidateProfile in the same transaction for a JOB_SEEKER', async () => {
      vi.spyOn(service, 'findByEmail').mockResolvedValue(null);
      const userCreateMock = vi.fn().mockResolvedValue({ id: 'user-2', role: Role.JOB_SEEKER, email: 'joana@exemplo.com' });
      const companyCreateMock = vi.fn().mockResolvedValue({});
      const candidateCreateMock = vi.fn().mockResolvedValue({});
      mockTx(userCreateMock, companyCreateMock, candidateCreateMock);

      await service.create({
        email: 'joana@exemplo.com',
        password: 'password1',
        role: Role.JOB_SEEKER,
        full_name: 'Joana da Silva',
        address: 'Bacaxá, Saquarema',
        bio: 'Atendente com experiência.',
        telefone: '22999997777',
      } as any);

      expect(candidateCreateMock).toHaveBeenCalledWith({
        user_id: 'user-2',
        full_name: 'Joana da Silva',
        address: 'Bacaxá, Saquarema',
        bio: 'Atendente com experiência.',
        telefone: '22999997777',
      });
      expect(companyCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('requestAccountDeletion', () => {
    it('throws NotFoundException if user is not found', async () => {
      vi.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.requestAccountDeletion('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('stores a deletion token and e-mails the user, without deleting anything', async () => {
      vi.spyOn(service, 'findById').mockResolvedValue({ id: 'user-id-123', email: 'test@test.com' } as any);
      const updateMock = vi.fn().mockResolvedValue({});
      const whereMock = vi.fn().mockReturnValue({ update: updateMock });
      (service as any).prisma = { user: { where: whereMock } };

      const result = await service.requestAccountDeletion('user-id-123');

      expect(whereMock).toHaveBeenCalledWith({ id: 'user-id-123' });
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletion_token: expect.stringMatching(/^[0-9a-f]{64}$/),
          deletion_token_expires_at: expect.any(String),
        }),
      );
      expect(mail.send).toHaveBeenCalledWith('test@test.com', expect.any(String), expect.stringContaining('excluir-conta/confirmar?token='));
      expect(result.message).toContain('e-mail de confirmação');
    });
  });

  describe('confirmAccountDeletion', () => {
    it('throws BadRequestException when the token does not exist', async () => {
      (service as any).prisma = { user: { where: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) } };
      await expect(service.confirmAccountDeletion('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the token has expired', async () => {
      const expired = new Date(Date.now() - 1000).toISOString();
      (service as any).prisma = {
        user: { where: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'user-id-123', deletion_token_expires_at: expired }) }) },
      };
      await expect(service.confirmAccountDeletion('token')).rejects.toThrow(BadRequestException);
    });

    it('hard-deletes the user row when the token is valid', async () => {
      const validExpiry = new Date(Date.now() + 60_000).toISOString();
      const deleteMock = vi.fn().mockResolvedValue({});
      const whereMock = vi
        .fn()
        .mockReturnValueOnce({ first: vi.fn().mockResolvedValue({ id: 'user-id-123', deletion_token_expires_at: validExpiry }) })
        .mockReturnValueOnce({ delete: deleteMock });
      (service as any).prisma = { user: { where: whereMock } };

      const result = await service.confirmAccountDeletion('token');

      expect(whereMock).toHaveBeenLastCalledWith({ id: 'user-id-123' });
      expect(deleteMock).toHaveBeenCalled();
      expect(result.message).toContain('excluídos permanentemente');
    });
  });
});

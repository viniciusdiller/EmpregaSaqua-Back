import { vi, describe, it, expect } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';

const setup = (job: any) => {
  const repo = { findByJobAndApplicant: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) };
  const svc = new ApplicationsService(
    repo as any,
    { getJobById: vi.fn().mockResolvedValue(job) } as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { svc, repo };
};
const active = (over: any = {}) => ({ status: 'ACTIVE', deleted_at: null, expires_at: null, questions: [], ...over });

describe('ApplicationsService.applyForJob', () => {
  it('recusa vaga em análise', async () => {
    await expect(setup(active({ status: 'PENDING' })).svc.applyForJob('u', 'j', {} as any)).rejects.toThrow(ConflictException);
  });
  it('recusa vaga expirada', async () => {
    await expect(setup(active({ expires_at: '2020-01-01T00:00:00Z' })).svc.applyForJob('u', 'j', {} as any)).rejects.toThrow(ConflictException);
  });
  it('exige resposta a todas as perguntas (omitir answers não pula a triagem)', async () => {
    const j = active({ questions: [{ id: 'q1', options: [{ id: 'o1', eliminates: false }, { id: 'o2', eliminates: true }] }] });
    await expect(setup(j).svc.applyForJob('u', 'j', {} as any)).rejects.toThrow(BadRequestException);
  });
  it('escolher opção eliminatória elimina o candidato', async () => {
    const j = active({ questions: [{ id: 'q1', options: [{ id: 'o1', eliminates: false }, { id: 'o2', eliminates: true }] }] });
    const { svc, repo } = setup(j);
    await svc.applyForJob('u', 'j', { answers: [{ question_id: 'q1', option_id: 'o2' }] } as any);
    expect(repo.create).toHaveBeenCalledWith('u', 'j', expect.anything(), 'REJECTED', true);
  });
});

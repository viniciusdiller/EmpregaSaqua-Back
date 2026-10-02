import { vi, describe, it, expect } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

const job = (over: any = {}) => ({
  id: 'j1', employer_id: 'emp', status: 'ACTIVE', deleted_at: null,
  questions: [{ id: 'q1', question_text: 'CNH?', options: [{ id: 'o1', option_text: 'Sim', eliminates: false }, { id: 'o2', option_text: 'Não', eliminates: true }] }], ...over,
});
const make = (j: any) => new JobsService({ findById: vi.fn().mockResolvedValue(j) } as any);

describe('JobsService.getJobForViewer', () => {
  it('nunca devolve o gabarito das perguntas (eliminates)', async () => {
    const r = await make(job()).getJobForViewer('j1', null);
    expect(r.questions).toEqual([{ id: 'q1', question_text: 'CNH?', options: [{ id: 'o1', option_text: 'Sim' }, { id: 'o2', option_text: 'Não' }] }]);
  });
  it('esconde vaga em análise de anônimos e de outros usuários', async () => {
    await expect(make(job({ status: 'PENDING' })).getJobForViewer('j1', null)).rejects.toThrow(NotFoundException);
    await expect(make(job({ status: 'PENDING' })).getJobForViewer('j1', { id: 'x', role: 'EMPLOYER' })).rejects.toThrow(NotFoundException);
  });
  it('esconde vaga removida', async () => {
    await expect(make(job({ deleted_at: 'x' })).getJobForViewer('j1', null)).rejects.toThrow(NotFoundException);
  });
  it('dono e admin veem vaga em análise', async () => {
    expect((await make(job({ status: 'PENDING' })).getJobForViewer('j1', { id: 'emp', role: 'EMPLOYER' })).status).toBe('PENDING');
    expect((await make(job({ status: 'PENDING' })).getJobForViewer('j1', { id: 'adm', role: 'ADMIN' })).status).toBe('PENDING');
  });
});

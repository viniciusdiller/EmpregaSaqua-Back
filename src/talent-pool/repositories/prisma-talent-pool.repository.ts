import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TalentPoolRepository } from './talent-pool.repository.interface.js';
import type { FieldOutputTypes } from '../../prisma/contract.d.js';
type SavedCandidate = FieldOutputTypes['public']['SavedCandidate'];

@Injectable()
export class PrismaTalentPoolRepository implements TalentPoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(employerId: string, candidateId: string, notes?: string): Promise<SavedCandidate> {
    const saved = await this.prisma.savedCandidate.create({
      employer_id: employerId,
      candidate_id: candidateId,
      notes: notes ?? null,
    });
    return saved as SavedCandidate;
  }

  async findByEmployer(employerId: string, page: number, limit: number): Promise<{ data: SavedCandidate[]; total: number }> {
    const baseQuery = this.prisma.savedCandidate.where({ employer_id: employerId });

    const [data, countResult] = await Promise.all([
      baseQuery
        .include('candidate', (c) => c.include('candidate_profile'))
        .orderBy((s) => s.created_at.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      baseQuery.aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      data: data as SavedCandidate[],
      total: countResult.total,
    };
  }

  async findByEmployerAndCandidate(employerId: string, candidateId: string): Promise<SavedCandidate | null> {
    const saved = await this.prisma.savedCandidate.where({
      employer_id: employerId,
      candidate_id: candidateId,
    }).first();
    return saved as SavedCandidate | null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.savedCandidate.where({ id }).delete();
  }

  async findById(id: string): Promise<SavedCandidate | null> {
    const saved = await this.prisma.savedCandidate.where({ id }).first();
    return saved as SavedCandidate | null;
  }
}

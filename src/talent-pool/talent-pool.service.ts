import { Injectable, Inject, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { TalentPoolRepository } from './repositories/talent-pool.repository.interface.js';
import { CreateSavedCandidateDto } from './dtos/create-saved-candidate.dto.js';

@Injectable()
export class TalentPoolService {
  constructor(
    @Inject('ITalentPoolRepository') private readonly repo: TalentPoolRepository,
  ) {}

  async saveCandidate(employerId: string, data: CreateSavedCandidateDto) {
    const existing = await this.repo.findByEmployerAndCandidate(employerId, data.candidate_id);
    if (existing) {
      throw new ConflictException('Este candidato já está salvo no seu banco de talentos.');
    }

    return this.repo.create(employerId, data.candidate_id, data.notes);
  }

  async getSavedCandidates(employerId: string, page: number = 1, limit: number = 10) {
    const { data, total } = await this.repo.findByEmployer(employerId, page, limit);
    return {
      data,
      meta: {
        total_items: total,
        total_pages: Math.ceil(total / limit),
        current_page: page,
        per_page: limit,
      },
    };
  }

  async removeCandidate(employerId: string, id: string) {
    const saved = await this.repo.findById(id);
    if (!saved) {
      throw new NotFoundException('Registro não encontrado no banco de talentos.');
    }

    if (saved.employer_id !== employerId) {
      throw new ForbiddenException('Você não tem permissão para remover este registro.');
    }

    await this.repo.delete(id);
  }
}

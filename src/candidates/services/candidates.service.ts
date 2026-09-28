import { Injectable, NotFoundException } from '@nestjs/common';
import { CandidatesRepository } from '../repositories/candidates.repository.js';
import { SearchCandidatesDto } from '../dtos/search-candidates.dto.js';
import { UpdateCandidateProfileDto } from '../dtos/update-candidate-profile.dto.js';

@Injectable()
export class CandidatesService {
  constructor(private candidatesRepository: CandidatesRepository) {}

  async searchCandidates(searchDto: SearchCandidatesDto) {
    return this.candidatesRepository.searchCandidates(searchDto);
  }

  /** Contas anteriores à criação de perfil no cadastro não têm a linha: cria vazia sob demanda. */
  async getMyProfile(userId: string) {
    return (await this.candidatesRepository.getMyProfile(userId)) ?? (await this.candidatesRepository.createEmpty(userId));
  }

  async updateMyProfile(userId: string, data: UpdateCandidateProfileDto) {
    await this.getMyProfile(userId);
    const result = await this.candidatesRepository.updateProfile(userId, data);
    if (!result) throw new NotFoundException('Perfil de candidato não encontrado.');
    return result;
  }

  async deleteMyAccount(userId: string) {
    return this.candidatesRepository.deleteAccount(userId);
  }
}

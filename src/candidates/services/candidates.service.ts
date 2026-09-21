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

  async getMyProfile(userId: string) {
    return this.candidatesRepository.getMyProfile(userId);
  }

  async updateMyProfile(userId: string, data: UpdateCandidateProfileDto) {
    const result = await this.candidatesRepository.updateProfile(userId, data);
    if (!result) throw new NotFoundException('Perfil de candidato não encontrado.');
    return result;
  }

  async deleteMyAccount(userId: string) {
    return this.candidatesRepository.deleteAccount(userId);
  }
}

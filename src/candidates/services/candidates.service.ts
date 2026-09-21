import { Injectable } from '@nestjs/common';
import { CandidatesRepository } from '../repositories/candidates.repository.js';
import { SearchCandidatesDto } from '../dtos/search-candidates.dto.js';

@Injectable()
export class CandidatesService {
  constructor(private candidatesRepository: CandidatesRepository) {}

  async searchCandidates(searchDto: SearchCandidatesDto) {
    return this.candidatesRepository.searchCandidates(searchDto);
  }

  async getMyProfile(userId: string) {
    return this.candidatesRepository.getMyProfile(userId);
  }
}

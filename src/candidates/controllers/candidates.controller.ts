import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CandidatesService } from '../services/candidates.service.js';
import { SearchCandidatesDto } from '../dtos/search-candidates.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma/db.js';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @Roles(Role.EMPLOYER, Role.ADMIN) // Employers and Admins can search candidates
  async search(@Query() searchDto: SearchCandidatesDto) {
    return this.candidatesService.searchCandidates(searchDto);
  }
}

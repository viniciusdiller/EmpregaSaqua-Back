import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { TalentPoolService } from './talent-pool.service.js';
import { CreateSavedCandidateDto } from './dtos/create-saved-candidate.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Talent Pool')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('talent-pool')
export class TalentPoolController {
  constructor(private readonly talentPoolService: TalentPoolService) {}

  @Post()
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Salvar um candidato no banco de talentos' })
  @HttpCode(HttpStatus.CREATED)
  async saveCandidate(@Req() req: any, @Body() data: CreateSavedCandidateDto) {
    const employerId = req.user.userId;
    return this.talentPoolService.saveCandidate(employerId, data);
  }

  @Get()
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Listar candidatos salvos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSavedCandidates(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const employerId = req.user.userId;
    return this.talentPoolService.getSavedCandidates(employerId, page, limit);
  }

  @Delete(':id')
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Remover um candidato do banco de talentos' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCandidate(@Req() req: any, @Param('id') id: string) {
    const employerId = req.user.userId;
    await this.talentPoolService.removeCandidate(employerId, id);
  }
}

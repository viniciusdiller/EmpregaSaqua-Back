import { Controller, Get, Query, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import { CandidatesService } from '../services/candidates.service.js';
import { PdfService } from '../../pdf/services/pdf.service.js';
import { SearchCandidatesDto } from '../dtos/search-candidates.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma/db.js';
import { Request, Response } from 'express';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly pdfService: PdfService
  ) {}

  @Get()
  @Roles(Role.EMPLOYER, Role.ADMIN) // Employers and Admins can search candidates
  async search(@Query() searchDto: SearchCandidatesDto) {
    return this.candidatesService.searchCandidates(searchDto);
  }

  @Get('resume/download')
  @Roles(Role.JOB_SEEKER) // Only candidate can download their own resume
  async downloadResume(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as any).id;
    const profile = await this.candidatesService.getMyProfile(userId);
    
    if (!profile) {
      throw new NotFoundException('Candidate profile not found.');
    }

    const pdfBuffer = await this.pdfService.generateResume(profile);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="curriculo.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}

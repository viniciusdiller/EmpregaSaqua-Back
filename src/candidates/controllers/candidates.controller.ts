import { Controller, Get, Patch, Delete, Body, Query, UseGuards, Req, Res, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { CandidatesService } from '../services/candidates.service.js';
import { PdfService } from '../../pdf/services/pdf.service.js';
import { SearchCandidatesDto } from '../dtos/search-candidates.dto.js';
import { UpdateCandidateProfileDto } from '../dtos/update-candidate-profile.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { UsersService } from '../../users/users.service.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma/db.js';
import type { Request, Response } from 'express';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly pdfService: PdfService,
    private readonly usersService: UsersService
  ) {}

  @Get()
  @Roles(Role.EMPLOYER, Role.ADMIN) // Employers and Admins can search candidates
  async search(@Query() searchDto: SearchCandidatesDto) {
    return this.candidatesService.searchCandidates(searchDto);
  }

  @Get('me/resume/pdf')
  @Roles(Role.JOB_SEEKER) // Only candidate can download their own resume
  async downloadResume(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as any).id;
    const profile = await this.candidatesService.getMyProfile(userId);
    
    if (!profile) {
      throw new NotFoundException('Candidate profile not found.');
    }

    const pdfStream = this.pdfService.buildResumeStream(profile);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="curriculo.pdf"',
    });

    pdfStream.pipe(res);
  }

  @Patch('profile')
  @Roles(Role.JOB_SEEKER) // Only the candidate can update their own profile
  async updateProfile(@Req() req: Request, @Body() dto: UpdateCandidateProfileDto) {
    const userId = (req.user as any).id;
    return this.candidatesService.updateMyProfile(userId, dto);
  }

  @Delete('profile')
  @Roles(Role.JOB_SEEKER) // Only the candidate can delete their own account
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: Request) {
    const userId = (req.user as any).id;
    await this.usersService.deleteAccount(userId);
  }
}

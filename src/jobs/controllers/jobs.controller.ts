import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JobsService } from '../services/jobs.service.js';
import { CreateJobDto } from '../dtos/create-job.dto.js';
import { FindJobsQueryDto } from '../dtos/find-jobs-query.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma/db.js';

import { VerifiedEmployerGuard } from '../../auth/guards/verified-employer.guard.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * GET /jobs — Public endpoint, no auth required.
   * Supports: ?page=1&limit=10&location=saquarema&title_like=dev&status=ACTIVE
   */
  @Get()
  async findAll(@Query() query: FindJobsQueryDto) {
    return this.jobsService.getPublicJobs(query);
  }

  /**
   * GET /jobs/:id — Public endpoint to fetch a single job by ID.
   */
  @Get(':id')
  async findOne(@Param('id') jobId: string) {
    return this.jobsService.getJobById(jobId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, VerifiedEmployerGuard)
  @Roles(Role.EMPLOYER)
  @Post()
  async create(@Request() req: any, @Body() createJobDto: CreateJobDto) {
    const employerId = req.user.id;
    return this.jobsService.createJob(employerId, createJobDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @Delete(':id')
  async remove(@Request() req: any, @Param('id') jobId: string) {
    const employerId = req.user.id;
    await this.jobsService.deleteEmployerJob(employerId, jobId);
    return { message: 'Vaga removida com sucesso' };
  }
}

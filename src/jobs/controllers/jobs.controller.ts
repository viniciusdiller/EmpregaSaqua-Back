import { Controller, Post, Body, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { JobsService } from '../services/jobs.service.js';
import { CreateJobDto } from '../dtos/create-job.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma/db.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @Post()
  async create(@Request() req: any, @Body() createJobDto: CreateJobDto): Promise<import('../entities/job.entity.js').Job> {
    const employerId = req.user.userId;
    return this.jobsService.createJob(employerId, createJobDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @Delete(':id')
  async remove(@Request() req: any, @Param('id') jobId: string) {
    const employerId = req.user.userId;
    await this.jobsService.deleteEmployerJob(employerId, jobId);
    return { message: 'Vaga removida com sucesso' };
  }
}

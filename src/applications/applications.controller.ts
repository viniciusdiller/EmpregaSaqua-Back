import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dtos/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dtos/update-application-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('jobs/:jobId/applications')
  @Roles(Role.JOB_SEEKER)
  async applyForJob(
    @Param('jobId') jobId: string,
    @Body() data: CreateApplicationDto,
    @Request() req: any,
  ): Promise<any> {
    return this.applicationsService.applyForJob(req.user.id, jobId, data);
  }

  @Get('jobs/:jobId/applications')
  @Roles(Role.EMPLOYER)
  async getJobApplications(
    @Param('jobId') jobId: string,
    @Request() req: any,
  ): Promise<any> {
    return this.applicationsService.getJobApplications(req.user.id, jobId);
  }

  @Get('applications')
  @Roles(Role.JOB_SEEKER)
  async getMyApplications(@Request() req: any): Promise<any> {
    return this.applicationsService.getMyApplications(req.user.id);
  }

  @Patch('applications/:id/status')
  @Roles(Role.EMPLOYER)
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() data: UpdateApplicationStatusDto,
    @Request() req: any,
  ): Promise<any> {
    return this.applicationsService.updateApplicationStatus(req.user.id, id, data);
  }

  @Delete('applications/:id')
  @Roles(Role.JOB_SEEKER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdrawApplication(@Param('id') id: string, @Request() req: any): Promise<void> {
    await this.applicationsService.withdrawApplication(req.user.id, id);
  }
}

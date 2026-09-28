import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { JobAlertsService } from './job-alerts.service.js';
import { CreateJobAlertDto } from './dtos/create-job-alert.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Job Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-alerts')
export class JobAlertsController {
  constructor(private readonly jobAlertsService: JobAlertsService) {}

  @Post()
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Criar um alerta de novas vagas' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: CreateJobAlertDto) {
    return this.jobAlertsService.create(req.user.id, data);
  }

  @Get('mine')
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Listar meus alertas de vaga' })
  async listMine(@Req() req: any) {
    return this.jobAlertsService.listMine(req.user.id);
  }

  @Delete(':id')
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Remover um alerta de vaga' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.jobAlertsService.remove(req.user.id, id);
  }
}

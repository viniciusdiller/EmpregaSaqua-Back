import { Controller, Get, Query, Patch, Param, UseGuards, Delete, Body, Request, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { UpdateJobDto } from '../jobs/dtos/update-job.dto.js';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto.js';
import { RejectCompanyDto } from './dtos/reject-company.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // All endpoints in this controller require ADMIN role
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private page(q: { page?: string; limit?: string }) {
    const page = Math.max(1, Number.parseInt(q.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit ?? '10', 10) || 10));
    return { page, limit };
  }

  @Get('jobs')
  async listJobs(@Query() q: { page?: string; limit?: string; status?: string }) {
    const { page, limit } = this.page(q);
    return this.adminService.listJobs(page, limit, q.status);
  }

  @Get('companies')
  async listCompanies(@Query() q: { page?: string; limit?: string; status?: string }) {
    const { page, limit } = this.page(q);
    return this.adminService.listCompanies(page, limit, q.status);
  }

  @Get('users')
  async listUsers(@Query() q: { page?: string; limit?: string; role?: string }) {
    const { page, limit } = this.page(q);
    return this.adminService.listUsers(page, limit, q.role);
  }

  @Patch('companies/:id/approve')
  async approveCompany(@Param('id') id: string) {
    return this.adminService.approveCompany(id);
  }

  @Patch('companies/:id/reject')
  async rejectCompany(@Param('id') id: string, @Body() dto: RejectCompanyDto) {
    return this.adminService.rejectCompany(id, dto.reason);
  }

  @Patch('jobs/:id/approve')
  async approveJob(@Param('id') id: string) {
    return this.adminService.approveJob(id);
  }

  @Patch('jobs/:id/reject')
  async rejectJob(@Param('id') id: string) {
    return this.adminService.rejectJob(id);
  }

  @Patch('jobs/:id')
  async updateJob(@Param('id') id: string, @Body() data: UpdateJobDto) {
    return this.adminService.updateJob(id, data);
  }

  @Delete('jobs/:id')
  async deleteJob(@Param('id') id: string) {
    return this.adminService.deleteJob(id);
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() data: UpdateUserRoleDto, @Request() req: any) {
    if (id === req.user.id) throw new ForbiddenException('Você não pode alterar a própria função.');
    return this.adminService.updateUserRole(id, data);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    if (id === req.user.id) throw new ForbiddenException('Você não pode remover a própria conta por aqui.');
    return this.adminService.deleteUser(id);
  }
}

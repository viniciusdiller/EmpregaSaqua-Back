import { Controller, Patch, Param, UseGuards, Delete, Body } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { UpdateJobDto } from '../jobs/dtos/update-job.dto.js';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // All endpoints in this controller require ADMIN role
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('companies/:id/approve')
  async approveCompany(@Param('id') id: string) {
    return this.adminService.approveCompany(id);
  }

  @Patch('companies/:id/reject')
  async rejectCompany(@Param('id') id: string) {
    return this.adminService.rejectCompany(id);
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
  async updateUserRole(@Param('id') id: string, @Body() data: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, data);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateJobDto } from '../jobs/dtos/update-job.dto.js';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async approveCompany(companyId: string) {
    const company = await this.prisma.companyProfile.where({ id: companyId }).first();
    if (!company) {
      throw new NotFoundException('Company Profile not found');
    }

    return this.prisma.companyProfile.where({ id: companyId }).update({
      verification_status: 'APPROVED',
    });
  }

  async rejectCompany(companyId: string) {
    const company = await this.prisma.companyProfile.where({ id: companyId }).first();
    if (!company) {
      throw new NotFoundException('Company Profile not found');
    }

    return this.prisma.companyProfile.where({ id: companyId }).update({
      verification_status: 'REJECTED',
    });
  }

  async approveJob(jobId: string) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.where({ id: jobId }).update({
      status: 'ACTIVE',
    });
  }

  async rejectJob(jobId: string) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.where({ id: jobId }).update({
      status: 'REJECTED',
    });
  }
  async updateJob(jobId: string, data: UpdateJobDto) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) throw new NotFoundException('Job not found');

    const { questions, status, ...updateData } = data;
    return this.prisma.job.where({ id: jobId }).update({
      ...updateData,
      ...(status && { status }),
    });
  }

  async deleteJob(jobId: string) {
    const job = await this.prisma.job.where({ id: jobId }).first();
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.job.where({ id: jobId }).delete();
  }

  async updateUserRole(userId: string, data: UpdateUserRoleDto) {
    const user = await this.prisma.user.where({ id: userId }).first();
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.where({ id: userId }).update({
      role: data.role,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.where({ id: userId }).first();
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.where({ id: userId }).delete();
  }
}

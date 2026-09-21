import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
}

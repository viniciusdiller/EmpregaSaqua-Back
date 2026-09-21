import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async approveCompany(companyId: string) {
    const company = await this.prisma.companyProfile.where((c) => c.id.eq(companyId)).first();
    if (!company) {
      throw new NotFoundException('Company Profile not found');
    }

    return this.prisma.companyProfile.update({
      where: (c) => c.id.eq(companyId),
      data: {
        verification_status: 'APPROVED',
      },
    });
  }

  async rejectCompany(companyId: string) {
    const company = await this.prisma.companyProfile.where((c) => c.id.eq(companyId)).first();
    if (!company) {
      throw new NotFoundException('Company Profile not found');
    }

    return this.prisma.companyProfile.update({
      where: (c) => c.id.eq(companyId),
      data: {
        verification_status: 'REJECTED',
      },
    });
  }

  async approveJob(jobId: string) {
    const job = await this.prisma.job.where((j) => j.id.eq(jobId)).first();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.update({
      where: (j) => j.id.eq(jobId),
      data: {
        status: 'ACTIVE',
      },
    });
  }

  async rejectJob(jobId: string) {
    const job = await this.prisma.job.where((j) => j.id.eq(jobId)).first();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.update({
      where: (j) => j.id.eq(jobId),
      data: {
        status: 'REJECTED',
      },
    });
  }
}

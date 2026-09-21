import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JobStatus, ApplicationStatus } from '../prisma/db.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminAnalytics() {
    const [users, companies, pendingJobs, activeJobs] = await Promise.all([
      this.prisma.user.aggregate((a) => ({ total: a.count() })),
      this.prisma.companyProfile.aggregate((a) => ({ total: a.count() })),
      this.prisma.job.where({ status: JobStatus.PENDING }).aggregate((a) => ({ total: a.count() })),
      this.prisma.job.where({ status: JobStatus.ACTIVE }).aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      total_users: users.total,
      total_companies: companies.total,
      pending_jobs: pendingJobs.total,
      active_jobs: activeJobs.total,
    };
  }

  async getEmployerAnalytics(employerId: string) {
    // 1. Get active jobs for this employer
    const activeJobsAgg = await this.prisma.job
      .where({ employer_id: employerId, status: JobStatus.ACTIVE })
      .aggregate((a) => ({ total: a.count() }));

    // 2. Fetch all job IDs owned by this employer
    const jobs = await this.prisma.job
      .where({ employer_id: employerId })
      .all();
    
    const jobIds = jobs.map((j) => j.id);

    // 3. If employer has no jobs, applications count is 0
    if (jobIds.length === 0) {
      return {
        active_jobs: activeJobsAgg.total,
        total_applications: 0,
        applications_by_status: [],
      };
    }

    // 4 & 5. Fetch applications and group by status
    const apps = await this.prisma.application
      .where((a) => a.job_id.in(jobIds))
      .all();

    const statusCounts: Record<string, number> = {};
    for (const app of apps) {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    }

    return {
      active_jobs: activeJobsAgg.total,
      total_applications: apps.length,
      applications_by_status: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
    };
  }
}

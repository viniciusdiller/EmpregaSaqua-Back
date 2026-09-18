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
      .project((j) => ({ id: j.id }))
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

    // 4. Count total applications
    const totalAppsAgg = await this.prisma.application
      .where((a) => a.job_id.in(jobIds))
      .aggregate((a) => ({ total: a.count() }));

    // 5. Group applications by status
    const appsByStatus = await this.prisma.application
      .where((a) => a.job_id.in(jobIds))
      .groupBy((a) => a.status)
      .aggregate((a) => ({
        status: a.status,
        count: a.count(),
      }))
      .all();

    return {
      active_jobs: activeJobsAgg.total,
      total_applications: totalAppsAgg.total,
      applications_by_status: appsByStatus.map(s => ({
        status: s.status,
        count: s.count,
      })),
    };
  }
}

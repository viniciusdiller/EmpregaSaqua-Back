import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin')
  @Roles(Role.ADMIN)
  async getAdminAnalytics() {
    return this.analyticsService.getAdminAnalytics();
  }

  @Get('employer')
  @Roles(Role.EMPLOYER)
  async getEmployerAnalytics(@Request() req: any) {
    return this.analyticsService.getEmployerAnalytics(req.user.id);
  }
}

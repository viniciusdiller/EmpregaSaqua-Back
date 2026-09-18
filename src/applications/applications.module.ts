import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { ApplicationsController } from './applications.controller.js';
import { PrismaApplicationsRepository } from './repositories/prisma-applications.repository.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [JobsModule, AuthModule, PrismaModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    {
      provide: 'IApplicationsRepository',
      useClass: PrismaApplicationsRepository,
    },
  ],
})
export class ApplicationsModule {}

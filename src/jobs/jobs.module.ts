import { Module } from '@nestjs/common';
import { JobsController } from './controllers/jobs.controller.js';
import { JobsService } from './services/jobs.service.js';
import { PrismaJobsRepository } from './repositories/prisma-jobs.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    {
      provide: 'IJobsRepository',
      useClass: PrismaJobsRepository,
    },
  ],
  exports: [JobsService],
})
export class JobsModule {}

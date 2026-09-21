import { Module } from '@nestjs/common';
import { TalentPoolService } from './talent-pool.service.js';
import { TalentPoolController } from './talent-pool.controller.js';
import { PrismaTalentPoolRepository } from './repositories/prisma-talent-pool.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TalentPoolController],
  providers: [
    TalentPoolService,
    {
      provide: 'ITalentPoolRepository',
      useClass: PrismaTalentPoolRepository,
    },
  ],
})
export class TalentPoolModule {}

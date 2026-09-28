import { Module } from '@nestjs/common';
import { CandidatesController } from './controllers/candidates.controller.js';
import { CandidatesService } from './services/candidates.service.js';
import { CandidatesRepository } from './repositories/candidates.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PdfModule } from '../pdf/pdf.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PdfModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, CandidatesRepository],
  exports: [CandidatesService],
})
export class CandidatesModule {}

import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';
import { ImageProcessingService } from './services/image-processing.service.js';
import { DocumentProcessingService } from './services/document-processing.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UploadsController],
  providers: [ImageProcessingService, DocumentProcessingService],
  exports: [ImageProcessingService, DocumentProcessingService],
})
export class UploadsModule {}

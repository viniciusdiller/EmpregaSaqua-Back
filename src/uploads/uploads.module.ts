import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';
import { ImageProcessingService } from './services/image-processing.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [ImageProcessingService],
  exports: [ImageProcessingService],
})
export class UploadsModule {}

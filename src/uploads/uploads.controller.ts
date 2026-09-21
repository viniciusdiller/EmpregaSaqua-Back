import {
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../prisma/db.js';
import { ImageUploadInterceptor } from './interceptors/image-upload.interceptor.js';
import { ImageProcessingService } from './services/image-processing.service.js';
import { DocumentUploadInterceptor } from './interceptors/document-upload.interceptor.js';
import { DocumentProcessingService } from './services/document-processing.service.js';

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly imageProcessingService: ImageProcessingService,
    private readonly documentProcessingService: DocumentProcessingService,
  ) {}

  /**
   * POST /uploads/logo
   * Accepts a multipart/form-data with a single 'file' field.
   * Only EMPLOYER role can upload logos.
   * Returns the public URL of the processed WebP image.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @UseInterceptors(ImageUploadInterceptor)
  @Post('logo')
  async uploadLogo(@Req() req: Request) {
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado. Envie o campo "file" com uma imagem.',
      );
    }

    const result = await this.imageProcessingService.processAndSaveLogo(
      file.buffer,
      file.mimetype,
    );

    return {
      message: 'Logo enviada e processada com sucesso.',
      url: result.url,
      filename: result.filename,
      size_bytes: result.sizeBytes,
    };
  }

  /**
   * POST /uploads/verification-document
   * Accepts a multipart/form-data with a single 'file' field (PDF max 5MB).
   * Only EMPLOYER role can upload verification documents.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @UseInterceptors(DocumentUploadInterceptor)
  @Post('verification-document')
  async uploadVerificationDocument(@Req() req: Request) {
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado. Envie o campo "file" com o documento PDF.',
      );
    }

    const result = await this.documentProcessingService.processAndSaveDocument(
      file.buffer,
      file.mimetype,
    );

    return {
      message: 'Documento enviado com sucesso. Aguarde a verificação.',
      url: result.url,
      filename: result.filename,
      size_bytes: result.sizeBytes,
    };
  }
}

import {
  Injectable,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const WEBP_QUALITY = 80;

export interface ProcessedImage {
  filename: string;
  url: string;
  sizeBytes: number;
}

@Injectable()
export class ImageProcessingService {
  /**
   * Validates, resizes, converts to WebP and saves an image buffer to disk.
   * @param buffer - Raw file buffer from multer MemoryStorage
   * @param mimetype - MIME type of the uploaded file
   * @param filenameBase - Custom filename base (e.g., 'Company Name')
   * @param subfolder - Subfolder inside /uploads (e.g., 'Logos')
   */
  async processAndSaveImage(
    buffer: Buffer, 
    mimetype: string,
    filenameBase: string,
    subfolder: string = 'Logos'
  ): Promise<ProcessedImage> {
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Tipo de arquivo inválido: ${mimetype}. Apenas imagens JPEG, PNG, WebP e GIF são aceitas.`,
      );
    }

    const outputDir = join(process.cwd(), 'uploads', subfolder);
    await mkdir(outputDir, { recursive: true });

    const processedBuffer = await sharp(buffer)
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // Sanitize filename to prevent directory traversal or invalid characters
    const safeBaseName = filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeBaseName}-${randomUUID().slice(0, 8)}.webp`;
    const filePath = join(outputDir, filename);

    await writeFile(filePath, processedBuffer);

    return {
      filename,
      url: `/uploads/${subfolder}/${filename}`,
      sizeBytes: processedBuffer.length,
    };
  }
}

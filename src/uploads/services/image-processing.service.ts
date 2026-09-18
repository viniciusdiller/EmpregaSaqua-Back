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
const LOGOS_DIR = join(process.cwd(), 'uploads', 'logos');

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
   * @returns Metadata of the saved file including its public URL
   */
  async processAndSaveLogo(buffer: Buffer, mimetype: string): Promise<ProcessedImage> {
    // Validate mime-type at the service level (defence-in-depth)
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Tipo de arquivo inválido: ${mimetype}. Apenas imagens JPEG, PNG, WebP e GIF são aceitas.`,
      );
    }

    // Ensure the output directory exists
    await mkdir(LOGOS_DIR, { recursive: true });

    // Process image: resize to max 800x800 (keeping aspect ratio) and convert to WebP
    const processedBuffer = await sharp(buffer)
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',       // Maintains aspect ratio, never upscales
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const filename = `${randomUUID()}.webp`;
    const filePath = join(LOGOS_DIR, filename);

    await writeFile(filePath, processedBuffer);

    return {
      filename,
      url: `/uploads/logos/${filename}`,
      sizeBytes: processedBuffer.length,
    };
  }
}

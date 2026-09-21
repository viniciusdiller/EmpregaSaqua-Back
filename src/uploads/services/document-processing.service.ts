import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'documents');

export interface ProcessedDocument {
  filename: string;
  url: string;
  sizeBytes: number;
}

@Injectable()
export class DocumentProcessingService {
  /**
   * Validates Magic Numbers for PDF and saves the file to disk.
   */
  async processAndSaveDocument(buffer: Buffer, mimetype: string): Promise<ProcessedDocument> {
    if (mimetype !== 'application/pdf') {
      throw new UnsupportedMediaTypeException('Apenas PDFs são permitidos.');
    }

    // Verify PDF Magic Number (%PDF- => 25 50 44 46 2D)
    if (
      buffer.length < 5 ||
      buffer[0] !== 0x25 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x44 ||
      buffer[3] !== 0x46 ||
      buffer[4] !== 0x2d
    ) {
      throw new UnsupportedMediaTypeException(
        'O arquivo enviado não é um PDF válido (Magic Number incorreto).',
      );
    }

    await mkdir(DOCUMENTS_DIR, { recursive: true });

    const filename = `${randomUUID()}.pdf`;
    const filePath = join(DOCUMENTS_DIR, filename);

    await writeFile(filePath, buffer);

    return {
      filename,
      url: `/uploads/documents/${filename}`,
      sizeBytes: buffer.length,
    };
  }
}

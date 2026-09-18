import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import multer, { memoryStorage } from 'multer';
import { Request, Response } from 'express';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new UnsupportedMediaTypeException(
          `Tipo de arquivo não suportado: ${file.mimetype}. Apenas JPEG, PNG, WebP e GIF são aceitos.`,
        ),
      );
    }
    callback(null, true);
  },
});

/**
 * Intercepts multipart/form-data requests and processes a single image file
 * using multer MemoryStorage. Enforces:
 *  - Only 1 file per request
 *  - Max size: 2MB
 *  - Allowed MIME types: JPEG, PNG, WebP, GIF
 */
@Injectable()
export class ImageUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    return new Observable((observer) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              observer.error(
                new PayloadTooLargeException(
                  `O arquivo excede o tamanho máximo permitido de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
                ),
              );
              return;
            }
            observer.error(new BadRequestException(`Erro no upload: ${err.message}`));
            return;
          }
          observer.error(err);
          return;
        }

        next.handle().subscribe({
          next: (val) => observer.next(val),
          error: (e) => observer.error(e),
          complete: () => observer.complete(),
        });
      });
    });
  }
}

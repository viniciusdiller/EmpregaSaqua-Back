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

export const ALLOWED_CHAT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_CHAT_ATTACHMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_CHAT_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new UnsupportedMediaTypeException(
          `Tipo de arquivo não suportado: ${file.mimetype}. Envie uma imagem (JPEG, PNG, WebP, GIF) ou um PDF.`,
        ),
      );
    }
    callback(null, true);
  },
});

/** Mesmo padrão de uploads/interceptors/image-upload.interceptor.ts, só que aceitando imagem OU PDF. */
@Injectable()
export class ChatAttachmentInterceptor implements NestInterceptor {
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
                  `O arquivo excede o tamanho máximo permitido de ${MAX_CHAT_ATTACHMENT_SIZE_BYTES / 1024 / 1024}MB.`,
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

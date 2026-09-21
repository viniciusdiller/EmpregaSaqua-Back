import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnsupportedMediaTypeException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import * as multer from 'multer';

@Injectable()
export class DocumentUploadInterceptor implements NestInterceptor {
  private fileInterceptor: NestInterceptor;

  constructor() {
    this.fileInterceptor = new (FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new UnsupportedMediaTypeException('Apenas arquivos PDF são permitidos.'), false);
        }
      },
    }))();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return this.fileInterceptor.intercept(context, next);
  }
}

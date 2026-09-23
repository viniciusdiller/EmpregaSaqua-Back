import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { db } from '../../prisma/db.js';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, user } = req;

    // Ignore GET requests
    if (method === 'GET') {
      return next.handle();
    }

    const now = Date.now();

    return next.handle().pipe(
      tap(async () => {
        const res = context.switchToHttp().getResponse();
        const statusCode = res.statusCode;

        try {
          const sanitizedPayload = this.sanitizePayload(body);

          const parts = url.split('?')[0].split('/').filter(Boolean);
          const entity = parts[0] ? `/${parts[0]}` : url;
          const entity_id = parts.length > 1 ? parts[1] : null;

          await db.orm.public.AuditLog.create({
            user_id: user?.id || null,
            action: method,
            entity,
            entity_id,
            ip_address: req.ip || req.connection?.remoteAddress || 'unknown',
            payload: sanitizedPayload,
          });
        } catch (error) {
          this.logger.error(`Failed to save audit log: ${error instanceof Error ? error.message : String(error)}`);
        }
      }),
    );
  }

  private sanitizePayload(payload: any): any {
    if (!payload) return payload;

    const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // Recursively sanitize nested objects/arrays, except buffers/streams
        if (Buffer.isBuffer(sanitized[key]) || sanitized[key].readable) {
          sanitized[key] = '[BINARY_DATA]';
        } else {
          sanitized[key] = this.sanitizePayload(sanitized[key]);
        }
      } else if (
        typeof key === 'string' &&
        (key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret'))
      ) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

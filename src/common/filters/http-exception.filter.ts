import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || res;
      code = 'HTTP_EXCEPTION';
    } else if (exception?.name === 'PrismaClientKnownRequestError') {
      // Prisma 8 errors look a bit different sometimes, but typically carry a code
      // E.g. P2002 for unique constraint
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Um registro com este valor já existe.';
        code = 'UNIQUE_CONSTRAINT_VIOLATION';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Erro na validação dos dados.';
        code = `PRISMA_ERROR_${exception.code}`;
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${exception.message}`,
        exception.stack,
      );
      // Mask stack trace in production-like response
      message = 'Ocorreu um erro interno no servidor.';
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

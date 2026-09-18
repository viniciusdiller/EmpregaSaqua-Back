import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security HTTP Headers
  app.use(helmet());

  // Enable Restricted CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? 'https://empregasaqua.com' : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Exception Filter to sanitize errors
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Validation Pipe for strict input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that don't have decorators
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are present
      transform: true, // Automatically transforms payloads to be objects typed according to their DTO classes
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

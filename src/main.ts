import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security HTTP Headers
  app.use(helmet());

  // Enable CORS
  app.enableCors();

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

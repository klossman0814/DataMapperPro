import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body parser limits for large payloads (e.g. Text-to-Table parse of 100MB+ files)
  const maxSize = process.env.MAX_FILE_SIZE || '500mb';
  app.use(express.json({ limit: maxSize }));
  app.use(express.urlencoded({ extended: true, limit: maxSize }));

  app.setGlobalPrefix('api');

  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5175')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes('*')) {
        callback(null, true);
      } else if (corsOrigins.some(o => origin.startsWith(o) || origin === o)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.use(helmet());
  app.use(compression());

  const port = process.env.PORT || 3002;
  await app.listen(port);
}
bootstrap();

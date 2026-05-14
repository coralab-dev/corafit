import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/env.schema';
import { PrismaService } from './common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);
  const prismaService = app.get(PrismaService);
  const port = configService.get('PORT', { infer: true });
  const allowedOrigins = configService.get('CORS_ALLOWED_ORIGINS', {
    infer: true,
  });

  prismaService.enableShutdownHooks(app);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(port);
  Logger.log(`CoraFit API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();

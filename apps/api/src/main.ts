/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Backend API : main.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Derrière le proxy Railway : faire confiance au 1er hop pour que `req.ip` reflète
  // l'IP réelle du client (X-Forwarded-For) → rate-limiting correct par IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // En-têtes de sécurité HTTP (XSS, sniffing, clickjacking…). API JSON → CSP inutile.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  // CORS restreint : allowlist via CORS_ORIGINS (séparés par des virgules).
  // À défaut on reste permissif (origin: true) pour ne pas casser un déploiement
  // non configuré — mais on alerte en production.
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasAllowlist = !!corsOrigins && corsOrigins.length > 0;
  app.enableCors({
    origin: hasAllowlist ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  if (!hasAllowlist && process.env.NODE_ENV === 'production') {
    Logger.warn(
      'CORS ouvert à toutes les origines. Définissez CORS_ORIGINS en production.',
      'Bootstrap',
    );
  }

  app.setGlobalPrefix('api');
  // La validation des entrées se fait par route via ZodValidationPipe (pas de class-validator).

  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Wilinwi API démarrée sur le port ${port}`, 'Bootstrap');
}

void bootstrap();

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
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // `bodyParser: false` + `useBodyParser(...)` manuel ci-dessous : la limite Express
  // par défaut (100kb) est trop stricte pour l'assistant vocal Wilinwi AI, qui envoie
  // l'audio capturé (MediaRecorder) en base64 dans le corps JSON — jusqu'à ~4 Mo de
  // caractères, cf. VOICE_MAX_AUDIO_BASE64_LENGTH (packages/types/src/ai.ts), qui
  // reste la limite faisant foi (Zod) ; celle-ci n'est qu'un plafond bas niveau.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '6mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '6mb' });

  // Derrière le proxy de la plateforme d'hébergement (Render, etc.) : faire confiance au
  // 1er hop pour que `req.ip` reflète l'IP réelle du client (X-Forwarded-For) → rate-limiting
  // correct par IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // En-têtes de sécurité HTTP (XSS, sniffing, clickjacking…). API JSON → CSP inutile.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  // CORS restreint : allowlist via CORS_ORIGINS (séparés par des virgules).
  // À défaut on reste permissif (origin: true) pour ne pas casser un déploiement
  // non configuré — mais on alerte en production.
  const corsOrigins = process.env.CORS_ORIGINS?.replace(/^['"]|['"]$/g, '')
    ?.split(',')
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

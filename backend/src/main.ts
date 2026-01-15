import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

const logger = new Logger('Bootstrap');

/**
 * Validación de secretos críticos - P0.4 Security Hardening
 * Fail-fast si configuración de seguridad es insegura
 */
function validateSecurityConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  const pacMode = process.env.PAC_MODE;
  const nodeEnv = process.env.NODE_ENV || 'development';

  const errors: string[] = [];
  const warnings: string[] = [];

  // ==================================
  // CRITICAL: DATABASE_URL
  // ==================================
  if (!databaseUrl) {
    errors.push('DATABASE_URL no está configurado - la aplicación no puede iniciar');
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL debe ser una URL válida de PostgreSQL');
  }

  // ==================================
  // CRITICAL: JWT_SECRET
  // ==================================
  if (!jwtSecret) {
    errors.push('JWT_SECRET no está configurado');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET debe tener al menos 32 caracteres');
  } else if (nodeEnv === 'production') {
    // En producción, verificar que no sea un valor por defecto
    const insecureSecrets = ['secret', 'jwt-secret', 'your-secret-key', 'changeme'];
    if (insecureSecrets.some(s => jwtSecret.toLowerCase().includes(s))) {
      errors.push('JWT_SECRET parece ser un valor inseguro por defecto');
    }
  }

  // ==================================
  // PRODUCTION: ENCRYPTION_KEY
  // ==================================
  if (!encryptionKey && nodeEnv === 'production') {
    errors.push('ENCRYPTION_KEY es requerida en producción');
  } else if (encryptionKey && encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY debe tener al menos 32 caracteres');
  }

  // ==================================
  // PAC_MODE validation
  // ==================================
  const validPacModes = ['sandbox', 'production', 'disabled'];
  if (!pacMode) {
    warnings.push('PAC_MODE no configurado - usando sandbox por defecto');
  } else if (!validPacModes.includes(pacMode.toLowerCase())) {
    errors.push(`PAC_MODE inválido: "${pacMode}". Valores válidos: ${validPacModes.join(', ')}`);
  } else if (nodeEnv === 'production' && pacMode.toLowerCase() === 'sandbox') {
    warnings.push('PAC_MODE=sandbox en producción - los CFDIs no serán válidos ante el SAT');
  }

  // ==================================
  // Show warnings (all environments)
  // ==================================
  if (warnings.length > 0) {
    logger.warn('='.repeat(60));
    logger.warn('ADVERTENCIAS DE CONFIGURACIÓN');
    logger.warn('='.repeat(60));
    warnings.forEach(w => logger.warn(`  ⚠️  ${w}`));
    logger.warn('='.repeat(60));
  }

  // ==================================
  // Fail-fast on errors
  // ==================================
  if (errors.length > 0) {
    if (nodeEnv === 'production' || nodeEnv === 'staging') {
      logger.error('='.repeat(60));
      logger.error('ERRORES CRÍTICOS DE CONFIGURACIÓN');
      logger.error('='.repeat(60));
      errors.forEach(e => logger.error(`  ❌ ${e}`));
      logger.error('='.repeat(60));
      logger.error('Abortando inicio de la aplicación...');
      process.exit(1);
    } else {
      logger.warn('='.repeat(60));
      logger.warn('ADVERTENCIAS DE CONFIGURACIÓN (serían fatales en producción)');
      logger.warn('='.repeat(60));
      errors.forEach(e => logger.warn(`  ⚠️  ${e}`));
      logger.warn('='.repeat(60));
    }
  }
}

async function bootstrap() {
  // Validar configuración de seguridad antes de iniciar
  validateSecurityConfig();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // ============================================
  // P0.4 - Security Hardening con Helmet
  // ============================================
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Para Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Para Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'"],
        },
      },
      // Prevenir clickjacking
      frameguard: { action: 'deny' },
      // Deshabilitar indicador de poder por Express
      hidePoweredBy: true,
      // Configurar HSTS (HTTP Strict Transport Security)
      hsts: {
        maxAge: 31536000, // 1 año
        includeSubDomains: true,
        preload: true,
      },
      // Prevenir MIME type sniffing
      noSniff: true,
      // Prevenir XSS en navegadores antiguos
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS configurado
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(url => url.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (como apps móviles o Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('No permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // ============================================
  // Global Exception Filter con soporte i18n
  // Retorna: { code, message, i18nKey, details?, timestamp, path }
  // ============================================
  app.useGlobalFilters(new ApiExceptionFilter());

  // ============================================
  // Validation Pipe con mensajes en español
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Elimina propiedades no decoradas
      forbidNonWhitelisted: true,   // Rechaza requests con propiedades extras
      transform: true,              // Transforma payloads a DTOs
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Siempre mostrar mensajes de validación (ahora están en español)
      disableErrorMessages: false,
      stopAtFirstError: false,      // Mostrar todos los errores de validación
    }),
  );

  // ============================================
  // Swagger: OFF by default in staging/production
  // Set ENABLE_SWAGGER=true to enable in non-dev environments
  // ============================================
  const nodeEnv = process.env.NODE_ENV || 'development';
  const enableSwagger =
    nodeEnv === 'development' ||
    process.env.ENABLE_SWAGGER === 'true';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Sistema de Nómina API')
      .setDescription('API para el Sistema de Nómina Empresarial - México')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticación y autorización')
      .addTag('employees', 'Gestión de empleados')
      .addTag('departments', 'Gestión de departamentos')
      .addTag('payroll', 'Cálculo y gestión de nómina')
      .addTag('attendance', 'Control de asistencia')
      .addTag('vacations', 'Gestión de vacaciones y permisos')
      .addTag('benefits', 'Prestaciones y beneficios')
      .addTag('cfdi', 'Timbrado de recibos CFDI')
      .addTag('government', 'Gestiones gubernamentales (IMSS, ISSSTE, INFONAVIT)')
      .addTag('reports', 'Reportes y exportación')
      .addTag('Health', 'Health checks y monitoreo')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`=`.repeat(60));
  logger.log(`Servidor ejecutándose en: http://localhost:${port}`);
  if (enableSwagger) {
    logger.log(`Documentación API: http://localhost:${port}/api/docs`);
  } else {
    logger.log(`Swagger: DESHABILITADO (set ENABLE_SWAGGER=true para habilitar)`);
  }
  logger.log(`Health Check: http://localhost:${port}/api/health`);
  logger.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`=`.repeat(60));
}

bootstrap();

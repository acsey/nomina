import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Servidor ejecutándose en: http://localhost:${port}`);
  console.log(`📚 Documentación API: http://localhost:${port}/api/docs`);
}

bootstrap();

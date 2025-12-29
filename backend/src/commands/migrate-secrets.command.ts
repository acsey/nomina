import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SecretsService } from '../common/security/secrets.service';

/**
 * Comando para migrar secretos existentes sin cifrar a formato cifrado
 *
 * Uso: npx ts-node src/commands/migrate-secrets.command.ts
 *
 * Este comando debe ejecutarse UNA SOLA VEZ después de actualizar
 * el sistema al nuevo módulo de seguridad.
 */
async function bootstrap() {
  console.log('='.repeat(60));
  console.log('MIGRACIÓN DE SECRETOS - Sistema de Nómina');
  console.log('='.repeat(60));
  console.log('');
  console.log('Este comando cifrará los secretos existentes en la base de datos:');
  console.log('  - Certificados SAT (.cer, .key, contraseñas)');
  console.log('  - Credenciales PAC (usuario, contraseña)');
  console.log('');
  console.log('IMPORTANTE: Asegúrese de que ENCRYPTION_KEY está configurada en .env');
  console.log('');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const secretsService = app.get(SecretsService);

    console.log('Iniciando migración...');
    console.log('');

    const result = await secretsService.migrateUnencryptedSecrets();

    console.log('='.repeat(60));
    console.log('RESULTADO DE LA MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`  Total de empresas: ${result.total}`);
    console.log(`  Empresas migradas: ${result.migrated}`);
    console.log(`  Errores: ${result.errors.length}`);
    console.log('');

    if (result.errors.length > 0) {
      console.log('ERRORES:');
      result.errors.forEach((error) => {
        console.log(`  - ${error}`);
      });
      console.log('');
    }

    if (result.migrated > 0) {
      console.log('✓ Migración completada exitosamente');
      console.log('');
      console.log('PRÓXIMOS PASOS:');
      console.log('  1. Verificar que el sistema funciona correctamente');
      console.log('  2. Realizar una prueba de timbrado');
      console.log('  3. RESPALDAR LA BASE DE DATOS');
      console.log('  4. Guardar ENCRYPTION_KEY en un lugar seguro');
    } else {
      console.log('ℹ No se encontraron secretos sin cifrar para migrar');
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('ERROR FATAL:', error.message);
    console.error('');
    console.error('Verifique que:');
    console.error('  1. ENCRYPTION_KEY está configurada en .env');
    console.error('  2. La clave tiene al menos 32 caracteres');
    console.error('  3. La base de datos está accesible');
    process.exit(1);
  }
}

bootstrap();

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { TenantModule } from './common/tenant/tenant.module';
import { SecurityModule } from './common/security/security.module';
import { FiscalModule } from './common/fiscal/fiscal.module';
import { FormulaModule } from './common/formulas/formula.module';
import { UtilsModule } from './common/utils/utils.module';
import { QueuesModule } from './common/queues/queues.module';
import { HealthModule } from './common/health/health.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { VacationsModule } from './modules/vacations/vacations.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { CfdiModule } from './modules/cfdi/cfdi.module';
import { GovernmentModule } from './modules/government/government.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { BulkUploadModule } from './modules/bulk-upload/bulk-upload.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { UsersModule } from './modules/users/users.module';
import { AccountingConfigModule } from './modules/accounting-config/accounting-config.module';
import { DevicesModule } from './modules/devices/devices.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { HierarchyModule } from './modules/hierarchy/hierarchy.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PacModule } from './modules/pac/pac.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailModule } from './modules/email/email.module';
import { PortalModule } from './modules/portal/portal.module';
import { SystemModulesModule } from './modules/system-modules/system-modules.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { N8nModule } from './modules/n8n/n8n.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    // ============================================
    // P0.4 - Rate Limiting por IP/usuario
    // ============================================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            // Límite general: 100 requests por minuto por IP
            name: 'short',
            ttl: 60000, // 1 minuto en ms
            limit: config.get<number>('RATE_LIMIT_SHORT', 100),
          },
          {
            // Límite medio: 1000 requests por hora por IP
            name: 'medium',
            ttl: 3600000, // 1 hora en ms
            limit: config.get<number>('RATE_LIMIT_MEDIUM', 1000),
          },
          {
            // Límite largo: 10000 requests por día por IP
            name: 'long',
            ttl: 86400000, // 24 horas en ms
            limit: config.get<number>('RATE_LIMIT_LONG', 10000),
          },
        ],
      }),
    }),
    PrismaModule,
    TenantModule.forRoot(), // Multi-tenant architecture (context, isolation, connection factory)
    SecurityModule, // Módulo de seguridad global (cifrado, secretos, auditoría)
    FiscalModule,   // Módulo fiscal global (UMA, SMG, tasas de riesgo)
    FormulaModule,  // Módulo de fórmulas global (evaluador seguro de expresiones)
    UtilsModule,    // Módulo de utilidades global (redondeo centralizado)
    QueuesModule.forRoot(),   // Módulo de colas (usa QUEUE_MODE para configurar)
    AuthModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    PayrollModule,
    AttendanceModule,
    VacationsModule,
    BenefitsModule,
    CfdiModule,
    GovernmentModule,
    ReportsModule,
    CatalogsModule,
    BulkUploadModule,
    IncidentsModule,
    AccountingConfigModule,
    DevicesModule,
    SystemConfigModule,
    HierarchyModule,
    UploadsModule,
    PacModule,      // Módulo de configuración de PACs
    NotificationsModule, // Sistema de notificaciones in-app
    EmailModule,    // Servicio de correo electrónico con SMTP
    HealthModule,   // Endpoints de health check para monitoreo
    PortalModule,   // Portal del empleado (documentos, reconocimientos, encuestas, etc.)
    SystemModulesModule, // Sistema modular (habilitar/deshabilitar módulos por empresa)
    WhatsAppModule,      // Checador por WhatsApp con geocercas
    N8nModule,           // Integración con n8n y ChatBot IA
    RolesModule,         // Gestión de roles y permisos
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // P0.4 - Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar middleware de correlationId a todas las rutas
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { FiscalModule } from './common/fiscal/fiscal.module';
import { FormulaModule } from './common/formulas/formula.module';
import { UtilsModule } from './common/utils/utils.module';
import { QueuesModule } from './common/queues/queues.module';
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
    PrismaModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

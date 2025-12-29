import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { UtilsModule } from './common/utils/utils.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SecurityModule, // Módulo de seguridad global (cifrado, secretos, auditoría)
    UtilsModule,    // Módulo de utilidades global (redondeo centralizado)
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

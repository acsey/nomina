import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    DepartmentsModule,
    PayrollModule,
    AttendanceModule,
    VacationsModule,
    BenefitsModule,
    CfdiModule,
    GovernmentModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { MfaService } from './mfa.service';
import { AuthController } from './auth.controller';
import { MfaController } from './mfa.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CompanyGuard } from './guards/company.guard';
import { SubordinatesGuard } from './guards/subordinates.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
    }),
    SystemConfigModule,
  ],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    MicrosoftAuthService,
    MfaService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    CompanyGuard,
    SubordinatesGuard,
    SuperAdminGuard,
  ],
  exports: [
    AuthService,
    MicrosoftAuthService,
    MfaService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    CompanyGuard,
    SubordinatesGuard,
    SuperAdminGuard,
  ],
})
export class AuthModule {}

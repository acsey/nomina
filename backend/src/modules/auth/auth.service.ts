import { Injectable, UnauthorizedException, ConflictException, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaService } from './mfa.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mfaService: MfaService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password, mfaCode } = loginDto;

    // Check if classic login is allowed
    const isClassicLoginAllowed = await this.systemConfigService.isClassicLoginAllowed();
    if (!isClassicLoginAllowed) {
      throw new ForbiddenException(
        'El inicio de sesión con contraseña está deshabilitado. Use SSO para ingresar.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Get auth policies
    const authPolicies = await this.systemConfigService.getAuthPolicies();

    // Check if MFA is required by policy or user has it enabled
    const userHasMfaEnabled = await this.mfaService.isMfaEnabled(user.id);
    const mfaRequired = userHasMfaEnabled || (authPolicies.mfaEnabled && authPolicies.enforceMfa);

    if (mfaRequired) {
      if (!mfaCode) {
        // MFA requerido pero no proporcionado - devolver respuesta especial
        throw new HttpException(
          {
            statusCode: HttpStatus.PRECONDITION_REQUIRED,
            message: 'Se requiere código MFA',
            error: 'MFA_REQUIRED',
            mfaRequired: true,
            // Tell frontend if user needs to set up MFA
            mfaSetupRequired: !userHasMfaEnabled && authPolicies.enforceMfa,
          },
          HttpStatus.PRECONDITION_REQUIRED,
        );
      }

      // Verify MFA code (only if user has MFA set up)
      if (userHasMfaEnabled) {
        const mfaResult = await this.mfaService.verifyMfa(user.id, mfaCode);
        if (!mfaResult.valid) {
          throw new UnauthorizedException('Código MFA inválido');
        }
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions,
      companyId: user.companyId,
    };

    // Include MFA requirement status in response
    const mfaSetupRequired = authPolicies.mfaEnabled && authPolicies.enforceMfa && !userHasMfaEnabled;

    return {
      access_token: this.jwtService.sign(payload),
      mfaSetupRequired,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        companyId: user.companyId,
        company: user.company ? {
          id: user.company.id,
          name: user.company.name,
          logo: user.company.logo,
          primaryColor: user.company.primaryColor,
          secondaryColor: user.company.secondaryColor,
        } : null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, roleId } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId,
      },
      include: { role: true },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, company: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}

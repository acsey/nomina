import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const REQUIRED_MODULE_KEY = 'requiredModule';

/**
 * Decorador para marcar un endpoint como dependiente de un módulo específico
 * @param moduleCode - Código del módulo requerido (ej: 'whatsapp_attendance', 'ai_chatbot')
 */
export const RequireModule = (moduleCode: string) =>
  SetMetadata(REQUIRED_MODULE_KEY, moduleCode);

/**
 * Guard que verifica si un módulo está habilitado para la empresa del usuario
 */
@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Si no hay módulo requerido, permitir acceso
    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario autenticado, denegar
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Super admin tiene acceso a todo
    if (user.role?.name === 'SYSTEM_ADMIN' && !user.companyId) {
      return true;
    }

    // Obtener companyId del usuario o de los params
    const companyId = user.companyId || request.params?.companyId;

    if (!companyId) {
      throw new ForbiddenException('No se pudo determinar la empresa');
    }

    // Verificar si el módulo está habilitado
    const isEnabled = await this.isModuleEnabled(companyId, requiredModule);

    if (!isEnabled) {
      throw new ForbiddenException(
        `El módulo "${requiredModule}" no está habilitado para esta empresa. Contacte al administrador.`
      );
    }

    return true;
  }

  private async isModuleEnabled(companyId: string, moduleCode: string): Promise<boolean> {
    const systemModule = await this.prisma.systemModule.findUnique({
      where: { code: moduleCode },
    });

    if (!systemModule) {
      return false;
    }

    // Módulos core siempre habilitados
    if (systemModule.isCore) {
      return true;
    }

    const companyModule = await this.prisma.companyModule.findUnique({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId: systemModule.id,
        },
      },
    });

    return companyModule ? companyModule.isEnabled : systemModule.defaultEnabled;
  }
}

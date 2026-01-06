import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

// Default system configurations
const DEFAULT_CONFIGS = [
  {
    key: 'MULTI_COMPANY_ENABLED',
    value: 'false',
    description: 'Habilita el modo multiempresa. Cuando está deshabilitado, los usuarios solo ven su empresa asignada.',
    dataType: 'boolean',
    category: 'general',
    isPublic: true,
  },
  {
    key: 'SYSTEM_NAME',
    value: 'Sistema de Nómina',
    description: 'Nombre del sistema mostrado en la interfaz',
    dataType: 'string',
    category: 'branding',
    isPublic: true,
  },
  {
    key: 'DEFAULT_LANGUAGE',
    value: 'es',
    description: 'Idioma por defecto del sistema',
    dataType: 'string',
    category: 'general',
    isPublic: true,
  },
  // Azure AD / Microsoft Entra ID Configuration
  {
    key: 'AZURE_AD_ENABLED',
    value: 'false',
    description: 'Habilita la autenticación con Microsoft Azure AD / Entra ID',
    dataType: 'boolean',
    category: 'azure_ad',
    isPublic: true,
  },
  {
    key: 'AZURE_AD_TENANT_ID',
    value: '',
    description: 'ID del tenant de Azure AD (Directory ID)',
    dataType: 'string',
    category: 'azure_ad',
    isPublic: false,
  },
  {
    key: 'AZURE_AD_CLIENT_ID',
    value: '',
    description: 'ID de la aplicación registrada en Azure AD',
    dataType: 'string',
    category: 'azure_ad',
    isPublic: false,
  },
  {
    key: 'AZURE_AD_CLIENT_SECRET',
    value: '',
    description: 'Secreto de la aplicación (mantener seguro)',
    dataType: 'string',
    category: 'azure_ad',
    isPublic: false,
  },
  {
    key: 'AZURE_AD_REDIRECT_URI',
    value: 'http://localhost:3000/auth/microsoft/callback',
    description: 'URL de redirección después de la autenticación',
    dataType: 'string',
    category: 'azure_ad',
    isPublic: false,
  },
  {
    key: 'AZURE_AD_AUTO_CREATE_USER',
    value: 'false',
    description: 'Crear usuario automáticamente al iniciar sesión con Microsoft si no existe',
    dataType: 'boolean',
    category: 'azure_ad',
    isPublic: false,
  },
  {
    key: 'AZURE_AD_SYNC_PHOTO',
    value: 'true',
    description: 'Sincronizar foto de perfil desde Microsoft',
    dataType: 'boolean',
    category: 'azure_ad',
    isPublic: false,
  },
  // Email / SMTP Configuration
  {
    key: 'SMTP_ENABLED',
    value: 'false',
    description: 'Habilita el envío de correos electrónicos',
    dataType: 'boolean',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_HOST',
    value: '',
    description: 'Servidor SMTP (ej: smtp.gmail.com, smtp.office365.com)',
    dataType: 'string',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_PORT',
    value: '587',
    description: 'Puerto SMTP (587 para TLS, 465 para SSL, 25 sin cifrado)',
    dataType: 'number',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_SECURE',
    value: 'false',
    description: 'Usar SSL/TLS directo (true para puerto 465)',
    dataType: 'boolean',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_USER',
    value: '',
    description: 'Usuario para autenticación SMTP',
    dataType: 'string',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_PASSWORD',
    value: '',
    description: 'Contraseña para autenticación SMTP',
    dataType: 'string',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_FROM_EMAIL',
    value: '',
    description: 'Dirección de correo del remitente',
    dataType: 'string',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'SMTP_FROM_NAME',
    value: 'Sistema de Nómina',
    description: 'Nombre del remitente que aparece en los correos',
    dataType: 'string',
    category: 'email',
    isPublic: false,
  },
  // Notification Channel Configuration
  {
    key: 'NOTIFICATION_CHANNEL',
    value: 'system_only',
    description: 'Canal de notificaciones: system_only (solo en sistema), email_and_system (correo y sistema)',
    dataType: 'string',
    category: 'notifications',
    isPublic: false,
  },
];

@Injectable()
export class SystemConfigService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Initialize default configurations if they don't exist
    await this.initializeDefaults();
  }

  private async initializeDefaults() {
    for (const config of DEFAULT_CONFIGS) {
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: config.key },
      });

      if (!existing) {
        await this.prisma.systemConfig.create({
          data: config,
        });
      }
    }
  }

  async getAll() {
    return this.prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getPublic() {
    return this.prisma.systemConfig.findMany({
      where: { isPublic: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getByKey(key: string) {
    return this.prisma.systemConfig.findUnique({
      where: { key },
    });
  }

  async getValue(key: string): Promise<any> {
    const config = await this.getByKey(key);
    if (!config) return null;

    switch (config.dataType) {
      case 'boolean':
        return config.value === 'true';
      case 'number':
        return Number(config.value);
      case 'json':
        try {
          return JSON.parse(config.value);
        } catch {
          return null;
        }
      default:
        return config.value;
    }
  }

  async update(key: string, value: string) {
    return this.prisma.systemConfig.update({
      where: { key },
      data: { value },
    });
  }

  async updateMultiple(configs: { key: string; value: string }[]) {
    const updates = configs.map((config) =>
      this.prisma.systemConfig.update({
        where: { key: config.key },
        data: { value: config.value },
      }),
    );

    return this.prisma.$transaction(updates);
  }

  async isMultiCompanyEnabled(): Promise<boolean> {
    const value = await this.getValue('MULTI_COMPANY_ENABLED');
    return value === true;
  }

  async getSmtpConfig(): Promise<{
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
  }> {
    const [enabled, host, port, secure, user, password, fromEmail, fromName] =
      await Promise.all([
        this.getValue('SMTP_ENABLED'),
        this.getValue('SMTP_HOST'),
        this.getValue('SMTP_PORT'),
        this.getValue('SMTP_SECURE'),
        this.getValue('SMTP_USER'),
        this.getValue('SMTP_PASSWORD'),
        this.getValue('SMTP_FROM_EMAIL'),
        this.getValue('SMTP_FROM_NAME'),
      ]);

    return {
      enabled: enabled === true,
      host: host || '',
      port: port || 587,
      secure: secure === true,
      user: user || '',
      password: password || '',
      fromEmail: fromEmail || '',
      fromName: fromName || 'Sistema de Nómina',
    };
  }

  async getNotificationChannel(): Promise<'system_only' | 'email_and_system'> {
    const value = await this.getValue('NOTIFICATION_CHANNEL');
    return value === 'email_and_system' ? 'email_and_system' : 'system_only';
  }

  async isEmailNotificationsEnabled(): Promise<boolean> {
    const [channel, smtpConfig] = await Promise.all([
      this.getNotificationChannel(),
      this.getSmtpConfig(),
    ]);
    return channel === 'email_and_system' && smtpConfig.enabled;
  }
}

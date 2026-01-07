import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EncryptionService } from '@/common/security/encryption.service';
import { AuditService, CriticalAction } from '@/common/security/audit.service';

// Keys that should be encrypted when stored
const ENCRYPTED_KEYS = ['AZURE_AD_CLIENT_SECRET', 'SMTP_PASSWORD'];

// Keys that are critical and require audit logging
const CRITICAL_KEYS = [
  'AZURE_AD_ENABLED',
  'AZURE_AD_CLIENT_SECRET',
  'ENFORCE_SSO',
  'ALLOW_CLASSIC_LOGIN',
  'MFA_ENABLED',
  'ENFORCE_MFA',
];

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
  // Security / Authentication Policies
  {
    key: 'ENFORCE_SSO',
    value: 'false',
    description: 'Forzar inicio de sesión solo con SSO (Azure AD). Deshabilita login con contraseña.',
    dataType: 'boolean',
    category: 'security',
    isPublic: true,
  },
  {
    key: 'ALLOW_CLASSIC_LOGIN',
    value: 'true',
    description: 'Permitir inicio de sesión con correo y contraseña',
    dataType: 'boolean',
    category: 'security',
    isPublic: true,
  },
  {
    key: 'MFA_ENABLED',
    value: 'false',
    description: 'Habilitar autenticación de dos factores (MFA/2FA) en el sistema',
    dataType: 'boolean',
    category: 'security',
    isPublic: true,
  },
  {
    key: 'ENFORCE_MFA',
    value: 'false',
    description: 'Requerir MFA obligatorio para todos los usuarios',
    dataType: 'boolean',
    category: 'security',
    isPublic: true,
  },
  {
    key: 'SESSION_TIMEOUT_MINUTES',
    value: '480',
    description: 'Tiempo de expiración de sesión en minutos (0 = sin expiración)',
    dataType: 'number',
    category: 'security',
    isPublic: false,
  },
  {
    key: 'MAX_LOGIN_ATTEMPTS',
    value: '5',
    description: 'Máximo número de intentos de login fallidos antes de bloquear',
    dataType: 'number',
    category: 'security',
    isPublic: false,
  },
];

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

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

    let value = config.value;

    // Decrypt if needed
    if (ENCRYPTED_KEYS.includes(key) && value && value.startsWith('enc:')) {
      try {
        value = this.encryptionService.decrypt(value.substring(4));
      } catch (error) {
        this.logger.warn(`Failed to decrypt ${key}, returning empty`);
        return '';
      }
    }

    switch (config.dataType) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return Number(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      default:
        return value;
    }
  }

  async update(key: string, value: string, userId?: string, justification?: string) {
    const oldConfig = await this.getByKey(key);
    const oldValue = oldConfig?.value;

    // Encrypt if needed
    let valueToStore = value;
    if (ENCRYPTED_KEYS.includes(key) && value && !value.startsWith('enc:')) {
      valueToStore = 'enc:' + this.encryptionService.encrypt(value);
    }

    const result = await this.prisma.systemConfig.update({
      where: { key },
      data: { value: valueToStore },
    });

    // Audit critical changes
    if (CRITICAL_KEYS.includes(key) && userId) {
      await this.auditService.logCriticalAction({
        userId,
        action: 'CONFIG_CHANGE',
        entity: 'SystemConfig',
        entityId: key,
        details: {
          key,
          oldValue: ENCRYPTED_KEYS.includes(key) ? '[ENCRYPTED]' : oldValue,
          newValue: ENCRYPTED_KEYS.includes(key) ? '[ENCRYPTED]' : value,
          justification: justification || 'No justification provided',
        },
      });
      this.logger.log(`Critical config ${key} changed by user ${userId}`);
    }

    return result;
  }

  async updateMultiple(
    configs: { key: string; value: string }[],
    userId?: string,
    justification?: string,
  ) {
    const criticalChanges: { key: string; oldValue: string; newValue: string }[] = [];

    // Get old values for critical configs
    for (const config of configs) {
      if (CRITICAL_KEYS.includes(config.key)) {
        const oldConfig = await this.getByKey(config.key);
        criticalChanges.push({
          key: config.key,
          oldValue: oldConfig?.value || '',
          newValue: config.value,
        });
      }
    }

    // Process configs with encryption
    const updates = configs.map((config) => {
      let valueToStore = config.value;
      if (ENCRYPTED_KEYS.includes(config.key) && config.value && !config.value.startsWith('enc:')) {
        valueToStore = 'enc:' + this.encryptionService.encrypt(config.value);
      }
      return this.prisma.systemConfig.update({
        where: { key: config.key },
        data: { value: valueToStore },
      });
    });

    const results = await this.prisma.$transaction(updates);

    // Audit critical changes
    if (criticalChanges.length > 0 && userId) {
      for (const change of criticalChanges) {
        await this.auditService.logCriticalAction({
          userId,
          action: 'CONFIG_CHANGE',
          entity: 'SystemConfig',
          entityId: change.key,
          details: {
            key: change.key,
            oldValue: ENCRYPTED_KEYS.includes(change.key) ? '[ENCRYPTED]' : change.oldValue,
            newValue: ENCRYPTED_KEYS.includes(change.key) ? '[ENCRYPTED]' : change.newValue,
            justification: justification || 'Batch update',
          },
        });
      }
      this.logger.log(`${criticalChanges.length} critical configs changed by user ${userId}`);
    }

    return results;
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

  // ===========================================
  // Authentication Policy Methods
  // ===========================================

  /**
   * Get all authentication policies
   */
  async getAuthPolicies(): Promise<{
    azureAdEnabled: boolean;
    enforceSso: boolean;
    allowClassicLogin: boolean;
    mfaEnabled: boolean;
    enforceMfa: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
  }> {
    const [
      azureAdEnabled,
      enforceSso,
      allowClassicLogin,
      mfaEnabled,
      enforceMfa,
      sessionTimeoutMinutes,
      maxLoginAttempts,
    ] = await Promise.all([
      this.getValue('AZURE_AD_ENABLED'),
      this.getValue('ENFORCE_SSO'),
      this.getValue('ALLOW_CLASSIC_LOGIN'),
      this.getValue('MFA_ENABLED'),
      this.getValue('ENFORCE_MFA'),
      this.getValue('SESSION_TIMEOUT_MINUTES'),
      this.getValue('MAX_LOGIN_ATTEMPTS'),
    ]);

    return {
      azureAdEnabled: azureAdEnabled === true,
      enforceSso: enforceSso === true,
      allowClassicLogin: allowClassicLogin !== false, // Default true
      mfaEnabled: mfaEnabled === true,
      enforceMfa: enforceMfa === true,
      sessionTimeoutMinutes: sessionTimeoutMinutes || 480,
      maxLoginAttempts: maxLoginAttempts || 5,
    };
  }

  /**
   * Check if classic (password) login is allowed
   */
  async isClassicLoginAllowed(): Promise<boolean> {
    const policies = await this.getAuthPolicies();
    // Classic login is blocked if SSO is enforced OR if classic login is explicitly disabled
    if (policies.enforceSso) return false;
    return policies.allowClassicLogin;
  }

  /**
   * Check if SSO login is available
   */
  async isSsoLoginAvailable(): Promise<boolean> {
    const azureAdEnabled = await this.getValue('AZURE_AD_ENABLED');
    return azureAdEnabled === true;
  }

  /**
   * Check if MFA should be required for a user
   */
  async shouldRequireMfa(userId: string): Promise<boolean> {
    const policies = await this.getAuthPolicies();

    // If MFA is not enabled system-wide, never require it
    if (!policies.mfaEnabled) return false;

    // If MFA is enforced, always require it
    if (policies.enforceMfa) return true;

    // Otherwise, MFA is optional (user can enable it themselves)
    return false;
  }

  /**
   * Get Azure AD configuration
   */
  async getAzureAdConfig(): Promise<{
    enabled: boolean;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    autoCreateUser: boolean;
    syncPhoto: boolean;
  }> {
    const [enabled, tenantId, clientId, clientSecret, redirectUri, autoCreateUser, syncPhoto] =
      await Promise.all([
        this.getValue('AZURE_AD_ENABLED'),
        this.getValue('AZURE_AD_TENANT_ID'),
        this.getValue('AZURE_AD_CLIENT_ID'),
        this.getValue('AZURE_AD_CLIENT_SECRET'),
        this.getValue('AZURE_AD_REDIRECT_URI'),
        this.getValue('AZURE_AD_AUTO_CREATE_USER'),
        this.getValue('AZURE_AD_SYNC_PHOTO'),
      ]);

    return {
      enabled: enabled === true,
      tenantId: tenantId || '',
      clientId: clientId || '',
      clientSecret: clientSecret || '',
      redirectUri: redirectUri || '',
      autoCreateUser: autoCreateUser === true,
      syncPhoto: syncPhoto !== false,
    };
  }

  /**
   * Validate Azure AD configuration completeness
   */
  async validateAzureAdConfig(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const config = await this.getAzureAdConfig();
    const errors: string[] = [];

    if (!config.tenantId) {
      errors.push('Tenant ID es requerido');
    }
    if (!config.clientId) {
      errors.push('Client ID es requerido');
    }
    if (!config.clientSecret) {
      errors.push('Client Secret es requerido');
    }
    if (!config.redirectUri) {
      errors.push('Redirect URI es requerido');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

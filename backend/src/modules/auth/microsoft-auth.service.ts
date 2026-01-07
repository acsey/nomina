import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import * as crypto from 'crypto';

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName: string;
  jobTitle?: string;
}

@Injectable()
export class MicrosoftAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async isEnabled(): Promise<boolean> {
    return this.systemConfigService.getValue('AZURE_AD_ENABLED') as Promise<boolean>;
  }

  async getAuthConfig() {
    const [tenantId, clientId, redirectUri] = await Promise.all([
      this.systemConfigService.getValue('AZURE_AD_TENANT_ID'),
      this.systemConfigService.getValue('AZURE_AD_CLIENT_ID'),
      this.systemConfigService.getValue('AZURE_AD_REDIRECT_URI'),
    ]);
    return { tenantId, clientId, redirectUri };
  }

  async getLoginUrl(): Promise<{ url: string; state: string }> {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) {
      throw new BadRequestException('La autenticación con Microsoft no está habilitada');
    }

    const { tenantId, clientId, redirectUri } = await this.getAuthConfig();

    if (!tenantId || !clientId) {
      throw new BadRequestException('La configuración de Azure AD está incompleta');
    }

    // Generate a random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'openid profile email User.Read',
      state,
    });

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

    return { url, state };
  }

  async handleCallback(code: string): Promise<{ access_token: string; user: any }> {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) {
      throw new BadRequestException('La autenticación con Microsoft no está habilitada');
    }

    const { tenantId, clientId, redirectUri } = await this.getAuthConfig();
    const clientSecret = await this.systemConfigService.getValue('AZURE_AD_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      throw new BadRequestException('La configuración de Azure AD está incompleta');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
      code,
    );

    // Get user info from Microsoft Graph
    const userInfo = await this.getMicrosoftUserInfo(tokenResponse.access_token);

    // Find or create user in our system
    const user = await this.findOrCreateUser(userInfo, tokenResponse.access_token);

    // Get the user with role
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    const roleName = userWithRole?.role?.name || 'user';

    // Generate our JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: roleName,
      companyId: user.companyId,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleName,
        companyId: user.companyId,
      },
    };
  }

  private async exchangeCodeForTokens(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<MicrosoftTokenResponse> {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange error:', error);
      throw new UnauthorizedException('Error al autenticar con Microsoft');
    }

    return response.json();
  }

  private async getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Error al obtener información del usuario de Microsoft');
    }

    return response.json();
  }

  private async getUserPhoto(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  }

  /**
   * Test Azure AD configuration by attempting to get a discovery document
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const { tenantId, clientId, redirectUri } = await this.getAuthConfig();

      // Validate configuration
      if (!tenantId) {
        return { success: false, message: 'Tenant ID no configurado' };
      }
      if (!clientId) {
        return { success: false, message: 'Client ID no configurado' };
      }
      if (!redirectUri) {
        return { success: false, message: 'Redirect URI no configurado' };
      }

      // Test by fetching OpenID Connect discovery document
      const discoveryUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
      const response = await fetch(discoveryUrl);

      if (!response.ok) {
        return {
          success: false,
          message: `Error al conectar con Azure AD: ${response.status} ${response.statusText}`,
        };
      }

      const discovery = await response.json();

      // Validate that the discovery document has the expected fields
      if (!discovery.authorization_endpoint || !discovery.token_endpoint) {
        return {
          success: false,
          message: 'Respuesta de Azure AD inválida: endpoints no encontrados',
        };
      }

      return {
        success: true,
        message: 'Conexión con Azure AD exitosa',
        details: {
          issuer: discovery.issuer,
          authorizationEndpoint: discovery.authorization_endpoint,
          tokenEndpoint: discovery.token_endpoint,
          tenantId,
          clientId,
          redirectUri,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error de conexión: ${error.message}`,
      };
    }
  }

  private async findOrCreateUser(userInfo: MicrosoftUserInfo, accessToken: string) {
    const email = userInfo.mail || userInfo.userPrincipalName;

    // First, try to find existing user
    let user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const autoCreate = await this.systemConfigService.getValue('AZURE_AD_AUTO_CREATE_USER');

    if (!user) {
      if (!autoCreate) {
        throw new UnauthorizedException(
          'Usuario no encontrado. Contacte al administrador para crear su cuenta.',
        );
      }

      // Get first company as default
      const defaultCompany = await this.prisma.company.findFirst();

      if (!defaultCompany) {
        throw new BadRequestException('No hay empresas configuradas en el sistema');
      }

      // Get the default user role
      const userRole = await this.prisma.role.findFirst({
        where: { name: 'user' },
      });

      if (!userRole) {
        throw new BadRequestException('No se encontró el rol de usuario por defecto');
      }

      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName: userInfo.givenName || userInfo.displayName.split(' ')[0],
          lastName: userInfo.surname || userInfo.displayName.split(' ').slice(1).join(' ') || '',
          password: '', // No password for Microsoft users
          roleId: userRole.id,
          companyId: defaultCompany.id,
          isActive: true,
          authProvider: 'microsoft',
          externalId: userInfo.id,
        },
      });
    } else {
      // Update user info from Microsoft
      const updateData: any = {
        firstName: userInfo.givenName || userInfo.displayName.split(' ')[0],
        lastName: userInfo.surname || userInfo.displayName.split(' ').slice(1).join(' ') || '',
        authProvider: user.authProvider || 'microsoft',
        externalId: user.externalId || userInfo.id,
      };

      // Sync photo if enabled
      const syncPhoto = await this.systemConfigService.getValue('AZURE_AD_SYNC_PHOTO');
      if (syncPhoto) {
        const photo = await this.getUserPhoto(accessToken);
        if (photo) {
          // If user is linked to an employee, update the employee photo
          const employee = await this.prisma.employee.findFirst({
            where: { email: email.toLowerCase() },
          });
          if (employee) {
            // Store as data URL for now (in production, save to file system)
            await this.prisma.employee.update({
              where: { id: employee.id },
              data: { photoUrl: photo },
            });
          }
        }
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return user;
  }
}

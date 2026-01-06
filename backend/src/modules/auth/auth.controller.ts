import { Controller, Post, Body, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators';
import { Public } from '@/common/decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly microsoftAuthService: MicrosoftAuthService,
  ) {}

  @Public()
  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } }) // Solo 5 intentos de login por minuto por IP
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar nuevo usuario (solo admin)' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  // Microsoft Azure AD Authentication
  @Public()
  @Get('microsoft/status')
  @ApiOperation({ summary: 'Verificar si la autenticación con Microsoft está habilitada' })
  async getMicrosoftStatus() {
    const enabled = await this.microsoftAuthService.isEnabled();
    return { enabled };
  }

  @Public()
  @Get('microsoft/login')
  @ApiOperation({ summary: 'Obtener URL de inicio de sesión con Microsoft' })
  async getMicrosoftLoginUrl() {
    return this.microsoftAuthService.getLoginUrl();
  }

  @Public()
  @Get('microsoft/callback')
  @Throttle({ short: { ttl: 60000, limit: 10 } }) // Límite moderado para OAuth callbacks
  @ApiOperation({ summary: 'Callback de autenticación con Microsoft' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  async handleMicrosoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.microsoftAuthService.handleCallback(code);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const params = new URLSearchParams({
        token: result.access_token,
        user: JSON.stringify(result.user),
      });

      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = error.message || 'Error de autenticación';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '@/common/decorators';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly schedulerService: NotificationsSchedulerService,
  ) {}

  /**
   * Obtener notificaciones del usuario actual
   */
  @Get()
  @ApiOperation({ summary: 'Obtener mis notificaciones' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.findByUser(user.sub, {
      unreadOnly: unreadOnly === 'true',
      skip,
      take,
      type,
    });
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Obtener conteo de notificaciones no leídas' })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  /**
   * Marcar una notificación como leída
   */
  @Post(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  @Post('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  /**
   * Eliminar una notificación
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar notificación' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.delete(id, user.sub);
  }

  /**
   * Obtener cumpleaños próximos
   */
  @Get('upcoming-birthdays')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener cumpleaños próximos' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  async getUpcomingBirthdays(
    @CurrentUser() user: any,
    @Query('companyId') companyIdQuery?: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    // Super admin can specify any company
    const isSuperAdmin = user.role === 'admin' && !user.companyId;
    let companyId = user.companyId;

    if (isSuperAdmin && companyIdQuery) {
      companyId = companyIdQuery;
    } else if (!companyId) {
      throw new ForbiddenException('No tiene una empresa asignada');
    }

    return this.schedulerService.getUpcomingBirthdays(companyId, daysAhead || 7);
  }

  /**
   * Obtener aniversarios laborales próximos
   */
  @Get('upcoming-anniversaries')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener aniversarios laborales próximos' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  async getUpcomingAnniversaries(
    @CurrentUser() user: any,
    @Query('companyId') companyIdQuery?: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    // Super admin can specify any company
    const isSuperAdmin = user.role === 'admin' && !user.companyId;
    let companyId = user.companyId;

    if (isSuperAdmin && companyIdQuery) {
      companyId = companyIdQuery;
    } else if (!companyId) {
      throw new ForbiddenException('No tiene una empresa asignada');
    }

    return this.schedulerService.getUpcomingAnniversaries(companyId, daysAhead || 7);
  }

  /**
   * Ejecutar alertas manualmente (solo admin)
   */
  @Post('trigger-daily-alerts')
  @Roles('admin')
  @ApiOperation({ summary: 'Ejecutar alertas diarias manualmente (solo admin)' })
  async triggerDailyAlerts() {
    await this.schedulerService.handleDailyAlerts();
    return { success: true, message: 'Alertas diarias ejecutadas' };
  }
}

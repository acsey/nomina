import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompanyGuard } from '../auth/guards/company.guard';
import { PortalGuard, EmployeeOwnershipGuard } from '../auth/guards/portal.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { normalizeRole } from '@/common/decorators';
import { RoleName } from '@/common/constants/roles';

@ApiTags('portal')
@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard, PortalGuard, CompanyGuard)
@ApiBearerAuth()
export class PortalController {
  private readonly logger = new Logger(PortalController.name);
  constructor(private readonly portalService: PortalService) {}

  /**
   * Gets the employeeId for the current user.
   * For EMPLOYEE role users without employeeId in token, looks it up by email.
   */
  private async getEffectiveEmployeeId(user: any): Promise<string | null> {
    if (user.employeeId) {
      return user.employeeId;
    }

    // For EMPLOYEE role, look up by email
    const userRole = normalizeRole(user.role) as RoleName;
    if (userRole === RoleName.EMPLOYEE && user.email) {
      const employee = await this.portalService.getEmployeeByEmail(user.email);
      return employee?.id || null;
    }

    return null;
  }

  /**
   * Validates that the user can access the requested employeeId.
   * - Non-admin users can only access their own data
   * - Admin users can access employees within their own company
   * - Super admin (SYSTEM_ADMIN without companyId) can access any employee
   */
  private async validateEmployeeAccess(user: any, targetEmployeeId: string): Promise<void> {
    const userRole = normalizeRole(user.role) as RoleName;
    const adminRoles = [
      RoleName.SYSTEM_ADMIN,
      RoleName.COMPANY_ADMIN,
      RoleName.HR_ADMIN,
      RoleName.PAYROLL_ADMIN,
      RoleName.MANAGER,
    ];

    // Non-admin users can only access their own data
    if (!adminRoles.includes(userRole)) {
      const userEmployeeId = await this.getEffectiveEmployeeId(user);
      if (targetEmployeeId !== userEmployeeId) {
        this.logger.warn(`Access denied: User ${user.email} tried to access employeeId ${targetEmployeeId}`);
        throw new ForbiddenException('No tienes permiso para acceder a datos de otro empleado');
      }
      return;
    }

    // Super admin without companyId can access any employee
    if (userRole === RoleName.SYSTEM_ADMIN && !user.companyId) {
      return;
    }

    // Admin users must verify target employee is in their company
    if (user.companyId) {
      const targetEmployee = await this.portalService.getEmployeeCompanyId(targetEmployeeId);
      if (targetEmployee?.companyId !== user.companyId) {
        this.logger.warn(
          `Cross-company access attempt: User ${user.email} (company: ${user.companyId}) tried to access employee from company ${targetEmployee?.companyId}`,
        );
        throw new ForbiddenException('No tienes acceso a empleados de otra empresa');
      }
    }
  }

  // =====================================
  // /ME ENDPOINTS - Use JWT employeeId, no URL param needed
  // =====================================

  @Get('me/profile')
  @ApiOperation({ summary: 'Obtener mi perfil de empleado' })
  async getMyProfile(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getEmployeeProfile(employeeId);
  }

  @Get('me/documents')
  @ApiOperation({ summary: 'Obtener mis documentos' })
  async getMyOwnDocuments(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyDocuments(employeeId);
  }

  @Get('me/recognitions')
  @ApiOperation({ summary: 'Obtener mis reconocimientos' })
  async getMyOwnRecognitions(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyRecognitions(employeeId);
  }

  @Get('me/points')
  @ApiOperation({ summary: 'Obtener mis puntos' })
  async getMyOwnPoints(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getEmployeePoints(employeeId);
  }

  @Get('me/courses')
  @ApiOperation({ summary: 'Obtener mis cursos' })
  async getMyOwnCourses(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyCourses(employeeId);
  }

  @Get('me/badges')
  @ApiOperation({ summary: 'Obtener mis insignias' })
  async getMyOwnBadges(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyBadges(employeeId);
  }

  @Get('me/benefits')
  @ApiOperation({ summary: 'Obtener mis prestaciones' })
  async getMyOwnBenefits(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyBenefits(employeeId);
  }

  @Get('me/attendance')
  @ApiOperation({ summary: 'Obtener mi asistencia de hoy' })
  async getMyOwnAttendance(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyAttendance(employeeId);
  }

  @Get('me/vacations')
  @ApiOperation({ summary: 'Obtener mis vacaciones' })
  async getMyOwnVacations(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyVacations(employeeId);
  }

  @Get('me/payrolls')
  @ApiOperation({ summary: 'Obtener mis recibos de nomina' })
  async getMyOwnPayrolls(@CurrentUser() user: any) {
    const employeeId = await this.getEffectiveEmployeeId(user);
    if (!employeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyPayrolls(employeeId);
  }

  // =====================================
  // EMPLOYEE DOCUMENTS (Legacy with :employeeId - kept for admin access)
  // =====================================

  @Get('documents/company')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Obtener todos los documentos de la empresa (RH)' })
  getCompanyDocuments(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getCompanyDocuments(companyId);
  }

  @Get('documents/:employeeId')
  @ApiOperation({ summary: 'Obtener documentos del empleado (admin access)' })
  async getEmployeeDocuments(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    await this.validateEmployeeAccess(user, employeeId);
    return this.portalService.getMyDocuments(employeeId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Subir documento' })
  async uploadDocument(
    @Body() uploadDto: any,
    @CurrentUser() user: any,
  ) {
    const userRole = normalizeRole(user.role) as RoleName;
    const adminRoles = [
      RoleName.SYSTEM_ADMIN,
      RoleName.COMPANY_ADMIN,
      RoleName.HR_ADMIN,
    ];

    // Determine target employeeId
    let targetEmployeeId: string;

    if (adminRoles.includes(userRole) && uploadDto.employeeId) {
      // Admin uploading to specific employee - validate cross-company access
      targetEmployeeId = uploadDto.employeeId;
      await this.validateEmployeeAccess(user, targetEmployeeId);
    } else {
      // Non-admin OR admin without specifying employeeId - use own employeeId
      targetEmployeeId = user.employeeId;
      if (!targetEmployeeId) {
        throw new ForbiddenException('No tienes un perfil de empleado para subir documentos');
      }
    }

    return this.portalService.uploadDocument({
      ...uploadDto,
      employeeId: targetEmployeeId,
      uploadedById: user.sub,
    });
  }

  @Patch('documents/:id/validate')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Validar documento (RH)' })
  validateDocument(
    @Param('id') id: string,
    @Body() validateDto: { status: 'APPROVED' | 'REJECTED'; notes?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.portalService.validateDocument(id, {
      status: validateDto.status,
      validatedById: userId,
      notes: validateDto.notes,
    });
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Eliminar documento' })
  deleteDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    // Service will verify ownership
    return this.portalService.deleteDocument(id, user.employeeId, user);
  }

  // =====================================
  // DISCOUNTS
  // =====================================

  @Get('discounts')
  @ApiOperation({ summary: 'Obtener descuentos de la empresa' })
  getDiscounts(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getDiscounts(companyId);
  }

  @Post('discounts')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Crear descuento' })
  createDiscount(
    @Body() createDto: any,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.portalService.createDiscount(companyId, createDto);
  }

  // =====================================
  // AGREEMENTS
  // =====================================

  @Get('agreements')
  @ApiOperation({ summary: 'Obtener convenios de la empresa' })
  getAgreements(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getAgreements(companyId);
  }

  @Post('agreements')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Crear convenio' })
  createAgreement(
    @Body() createDto: any,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.portalService.createAgreement(companyId, createDto);
  }

  // =====================================
  // RECOGNITIONS
  // =====================================

  @Get('recognitions/me/:employeeId')
  @ApiOperation({ summary: 'Obtener mis reconocimientos - DEPRECATED: usar /me/recognitions' })
  async getMyRecognitions(
    @Param('employeeId') _employeeId: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Always use token's employeeId, ignore URL param
    const effectiveEmployeeId = await this.getEffectiveEmployeeId(user);
    if (!effectiveEmployeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyRecognitions(effectiveEmployeeId);
  }

  @Get('recognitions/company')
  @ApiOperation({ summary: 'Obtener reconocimientos publicos de la empresa' })
  getCompanyRecognitions(
    @CurrentUser('companyId') companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.portalService.getCompanyRecognitions(companyId, limit ? parseInt(limit) : 20);
  }

  @Post('recognitions')
  @ApiOperation({ summary: 'Dar reconocimiento a un empleado' })
  giveRecognition(
    @Body() createDto: any,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    // Use the actual employee's ID or throw if not an employee
    if (!user.employeeId) {
      throw new ForbiddenException('Solo empleados pueden dar reconocimientos');
    }
    return this.portalService.giveRecognition({
      ...createDto,
      companyId,
      givenById: user.employeeId,
    });
  }

  @Get('points/:employeeId')
  @ApiOperation({ summary: 'Obtener puntos del empleado - DEPRECATED: usar /me/points' })
  async getEmployeePoints(
    @Param('employeeId') _employeeId: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Always use token's employeeId, ignore URL param
    const effectiveEmployeeId = await this.getEffectiveEmployeeId(user);
    if (!effectiveEmployeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getEmployeePoints(effectiveEmployeeId);
  }

  // =====================================
  // COURSES
  // =====================================

  @Get('courses/available')
  @ApiOperation({ summary: 'Obtener cursos disponibles' })
  getAvailableCourses(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getAvailableCourses(companyId);
  }

  @Get('courses/me/:employeeId')
  @ApiOperation({ summary: 'Obtener mis cursos - DEPRECATED: usar /me/courses' })
  async getMyCourses(
    @Param('employeeId') _employeeId: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Always use token's employeeId, ignore URL param
    const effectiveEmployeeId = await this.getEffectiveEmployeeId(user);
    if (!effectiveEmployeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyCourses(effectiveEmployeeId);
  }

  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Inscribirse en un curso' })
  enrollInCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: any,
  ) {
    if (!user.employeeId) {
      throw new ForbiddenException('Solo empleados pueden inscribirse en cursos');
    }
    return this.portalService.enrollInCourse(user.employeeId, courseId);
  }

  @Patch('courses/:courseId/progress')
  @ApiOperation({ summary: 'Actualizar progreso del curso' })
  updateCourseProgress(
    @Param('courseId') courseId: string,
    @Body() updateDto: { progress: number },
    @CurrentUser() user: any,
  ) {
    if (!user.employeeId) {
      throw new ForbiddenException('Solo empleados pueden actualizar progreso de cursos');
    }
    return this.portalService.updateCourseProgress(user.employeeId, courseId, updateDto.progress);
  }

  @Post('courses')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Crear curso' })
  createCourse(
    @Body() createDto: any,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.portalService.createCourse(companyId, createDto);
  }

  // =====================================
  // BADGES
  // =====================================

  @Get('badges/company')
  @ApiOperation({ summary: 'Obtener insignias de la empresa' })
  getCompanyBadges(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getCompanyBadges(companyId);
  }

  @Get('badges/me/:employeeId')
  @ApiOperation({ summary: 'Obtener mis insignias - DEPRECATED: usar /me/badges' })
  async getMyBadges(
    @Param('employeeId') _employeeId: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Always use token's employeeId, ignore URL param
    const effectiveEmployeeId = await this.getEffectiveEmployeeId(user);
    if (!effectiveEmployeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyBadges(effectiveEmployeeId);
  }

  @Post('badges/:badgeId/award')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Otorgar insignia a empleado' })
  async awardBadge(
    @Param('badgeId') badgeId: string,
    @Body() awardDto: { employeeId: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    // Validate admin can access this employee (cross-company check)
    await this.validateEmployeeAccess(user, awardDto.employeeId);
    return this.portalService.awardBadge(awardDto.employeeId, badgeId, awardDto.reason);
  }

  @Post('badges')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Crear insignia' })
  createBadge(
    @Body() createDto: any,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.portalService.createBadge(companyId, createDto);
  }

  // =====================================
  // SURVEYS
  // =====================================

  @Get('surveys/all')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Obtener todas las encuestas (RH)' })
  getAllSurveys(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getAllSurveys(companyId);
  }

  @Get('surveys/available')
  @ApiOperation({ summary: 'Obtener encuestas disponibles' })
  getAvailableSurveys(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.portalService.getAvailableSurveys(companyId, employeeId);
  }

  @Get('surveys/:id')
  @ApiOperation({ summary: 'Obtener detalle de encuesta' })
  getSurveyDetails(@Param('id') id: string) {
    return this.portalService.getSurveyDetails(id);
  }

  @Post('surveys/:id/respond')
  @ApiOperation({ summary: 'Responder encuesta' })
  submitSurveyResponse(
    @Param('id') surveyId: string,
    @Body() responseDto: { answers: any[] },
    @CurrentUser() user: any,
  ) {
    // Use user's employeeId (can be null for anonymous surveys)
    return this.portalService.submitSurveyResponse(surveyId, user.employeeId, responseDto.answers);
  }

  @Post('surveys')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Crear encuesta' })
  createSurvey(
    @Body() createDto: any,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.portalService.createSurvey(companyId, {
      ...createDto,
      createdById: userId,
    });
  }

  @Patch('surveys/:id/publish')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Publicar encuesta' })
  publishSurvey(@Param('id') id: string) {
    return this.portalService.publishSurvey(id);
  }

  @Get('surveys/:id/results')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Obtener resultados de encuesta' })
  getSurveyResults(@Param('id') id: string) {
    return this.portalService.getSurveyResults(id);
  }

  // =====================================
  // BENEFITS
  // =====================================

  @Get('benefits/:employeeId')
  @ApiOperation({ summary: 'Obtener prestaciones del empleado - DEPRECATED: usar /me/benefits' })
  async getMyBenefits(
    @Param('employeeId') _employeeId: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Always use token's employeeId, ignore URL param
    const effectiveEmployeeId = await this.getEffectiveEmployeeId(user);
    if (!effectiveEmployeeId) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.portalService.getMyBenefits(effectiveEmployeeId);
  }
}

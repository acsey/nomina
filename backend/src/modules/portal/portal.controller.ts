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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '@/common/decorators';

@ApiTags('portal')
@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  // =====================================
  // EMPLOYEE DOCUMENTS
  // =====================================

  @Get('documents/company')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Obtener todos los documentos de la empresa (RH)' })
  getCompanyDocuments(@CurrentUser('companyId') companyId: string) {
    return this.portalService.getCompanyDocuments(companyId);
  }

  @Get('documents/:employeeId')
  @ApiOperation({ summary: 'Obtener documentos del empleado' })
  getMyDocuments(@Param('employeeId') employeeId: string) {
    return this.portalService.getMyDocuments(employeeId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Subir documento' })
  uploadDocument(
    @Body() uploadDto: any,
    @CurrentUser('sub') userId: string,
  ) {
    return this.portalService.uploadDocument({
      ...uploadDto,
      uploadedById: userId,
    });
  }

  @Patch('documents/:id/validate')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
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
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.portalService.deleteDocument(id, employeeId);
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
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
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
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
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
  @ApiOperation({ summary: 'Obtener mis reconocimientos' })
  getMyRecognitions(@Param('employeeId') employeeId: string) {
    return this.portalService.getMyRecognitions(employeeId);
  }

  @Get('recognitions/company')
  @ApiOperation({ summary: 'Obtener reconocimientos públicos de la empresa' })
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
    @CurrentUser('employeeId') givenById: string,
  ) {
    return this.portalService.giveRecognition({
      ...createDto,
      companyId,
      givenById,
    });
  }

  @Get('points/:employeeId')
  @ApiOperation({ summary: 'Obtener puntos del empleado' })
  getEmployeePoints(@Param('employeeId') employeeId: string) {
    return this.portalService.getEmployeePoints(employeeId);
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
  @ApiOperation({ summary: 'Obtener mis cursos' })
  getMyCourses(@Param('employeeId') employeeId: string) {
    return this.portalService.getMyCourses(employeeId);
  }

  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Inscribirse en un curso' })
  enrollInCourse(
    @Param('courseId') courseId: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.portalService.enrollInCourse(employeeId, courseId);
  }

  @Patch('courses/:courseId/progress')
  @ApiOperation({ summary: 'Actualizar progreso del curso' })
  updateCourseProgress(
    @Param('courseId') courseId: string,
    @Body() updateDto: { progress: number },
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.portalService.updateCourseProgress(employeeId, courseId, updateDto.progress);
  }

  @Post('courses')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
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
  @ApiOperation({ summary: 'Obtener mis insignias' })
  getMyBadges(@Param('employeeId') employeeId: string) {
    return this.portalService.getMyBadges(employeeId);
  }

  @Post('badges/:badgeId/award')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Otorgar insignia a empleado' })
  awardBadge(
    @Param('badgeId') badgeId: string,
    @Body() awardDto: { employeeId: string; reason?: string },
  ) {
    return this.portalService.awardBadge(awardDto.employeeId, badgeId, awardDto.reason);
  }

  @Post('badges')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
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
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.portalService.submitSurveyResponse(surveyId, employeeId, responseDto.answers);
  }

  @Post('surveys')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
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
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Publicar encuesta' })
  publishSurvey(@Param('id') id: string) {
    return this.portalService.publishSurvey(id);
  }

  @Get('surveys/:id/results')
  @Roles('admin', 'rh', 'SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Obtener resultados de encuesta' })
  getSurveyResults(@Param('id') id: string) {
    return this.portalService.getSurveyResults(id);
  }

  // =====================================
  // BENEFITS
  // =====================================

  @Get('benefits/:employeeId')
  @ApiOperation({ summary: 'Obtener prestaciones del empleado' })
  getMyBenefits(@Param('employeeId') employeeId: string) {
    return this.portalService.getMyBenefits(employeeId);
  }
}

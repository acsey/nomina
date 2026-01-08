import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =====================================
  // EMPLOYEE LOOKUP
  // =====================================

  /**
   * Get employee by email address
   */
  async getEmployeeByEmail(email: string) {
    return this.prisma.employee.findFirst({
      where: { email },
      select: { id: true, companyId: true },
    });
  }

  // =====================================
  // EMPLOYEE DOCUMENTS
  // =====================================

  async getCompanyDocuments(companyId: string) {
    return this.prisma.employeeDocument.findMany({
      where: {
        employee: {
          companyId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            department: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyDocuments(employeeId: string) {
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(data: {
    employeeId: string;
    type: string;
    name: string;
    path: string;
    fileSize?: number;
    mimeType?: string;
    description?: string;
    expiresAt?: Date;
    uploadedById: string;
  }) {
    // Create the document
    const document = await this.prisma.employeeDocument.create({
      data: {
        employeeId: data.employeeId,
        type: data.type as any,
        name: data.name,
        path: data.path,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        description: data.description,
        expiresAt: data.expiresAt,
        uploadedById: data.uploadedById,
        validationStatus: 'PENDING',
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            companyId: true,
          },
        },
      },
    });

    // Notify HR about the new document
    try {
      const employee = document.employee;
      if (employee?.companyId) {
        const rhUserIds = await this.notificationsService.getRHUserIds(employee.companyId);
        if (rhUserIds.length > 0) {
          await this.notificationsService.notifyDocumentUploaded({
            employeeName: `${employee.firstName} ${employee.lastName}`,
            employeeId: data.employeeId,
            documentType: data.type,
            documentName: data.name,
            rhUserIds,
            companyId: employee.companyId,
          });
          this.logger.log(`Document upload notification sent to ${rhUserIds.length} HR users`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send document upload notification: ${error.message}`);
      // Don't throw - notification failure shouldn't break upload
    }

    return document;
  }

  async validateDocument(documentId: string, data: {
    status: 'APPROVED' | 'REJECTED';
    validatedById: string;
    notes?: string;
  }) {
    const doc = await this.prisma.employeeDocument.findUnique({
      where: { id: documentId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyId: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    const updatedDoc = await this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        validationStatus: data.status,
        validatedById: data.validatedById,
        validatedAt: new Date(),
        validationNotes: data.notes,
      },
    });

    // Notify employee about the validation result
    try {
      const employee = doc.employee;
      if (employee?.companyId) {
        // Get the validator's name
        const validator = await this.prisma.user.findUnique({
          where: { id: data.validatedById },
          select: { firstName: true, lastName: true },
        });
        const validatorName = validator ? `${validator.firstName} ${validator.lastName}` : 'RH';

        // Get employee's user ID
        const employeeUserId = await this.notificationsService.getEmployeeUserId(employee.id);

        if (employeeUserId) {
          if (data.status === 'APPROVED') {
            await this.notificationsService.notifyDocumentValidated({
              employeeName: `${employee.firstName} ${employee.lastName}`,
              employeeUserId,
              documentType: doc.type,
              documentName: doc.name,
              validatedBy: validatorName,
              companyId: employee.companyId,
            });
          } else {
            await this.notificationsService.notifyDocumentRejected({
              employeeName: `${employee.firstName} ${employee.lastName}`,
              employeeUserId,
              documentType: doc.type,
              documentName: doc.name,
              rejectedBy: validatorName,
              reason: data.notes,
              companyId: employee.companyId,
            });
          }
          this.logger.log(`Document ${data.status} notification sent to employee`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send document validation notification: ${error.message}`);
      // Don't throw - notification failure shouldn't break validation
    }

    return updatedDoc;
  }

  async deleteDocument(documentId: string, employeeId: string, user?: any) {
    const doc = await this.prisma.employeeDocument.findUnique({
      where: { id: documentId },
      include: {
        employee: {
          select: { companyId: true },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Admins can delete any document in their company
    if (user) {
      const adminRoles = ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'admin', 'rh'];
      if (adminRoles.includes(user.role)) {
        // SYSTEM_ADMIN can delete any document
        if (user.role === 'SYSTEM_ADMIN' || user.role === 'admin') {
          return this.prisma.employeeDocument.delete({
            where: { id: documentId },
          });
        }
        // Other admins can only delete documents from their company
        if (doc.employee?.companyId === user.companyId) {
          return this.prisma.employeeDocument.delete({
            where: { id: documentId },
          });
        }
        throw new ForbiddenException('No puedes eliminar documentos de otra empresa');
      }
    }

    // Regular employees can only delete their own documents
    if (doc.employeeId !== employeeId) {
      throw new ForbiddenException('No tienes permiso para eliminar este documento');
    }

    return this.prisma.employeeDocument.delete({
      where: { id: documentId },
    });
  }

  // =====================================
  // DISCOUNTS
  // =====================================

  async getDiscounts(companyId: string) {
    const now = new Date();
    return this.prisma.companyDiscount.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiscount(companyId: string, data: {
    partnerCompany: string;
    logo?: string;
    description: string;
    discount: string;
    category: string;
    code?: string;
    url?: string;
    validFrom?: Date;
    validUntil?: Date;
    terms?: string;
  }) {
    return this.prisma.companyDiscount.create({
      data: {
        companyId,
        partnerCompany: data.partnerCompany,
        logo: data.logo,
        description: data.description,
        discount: data.discount,
        category: data.category as any,
        code: data.code,
        url: data.url,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        terms: data.terms,
      },
    });
  }

  // =====================================
  // AGREEMENTS
  // =====================================

  async getAgreements(companyId: string) {
    return this.prisma.companyAgreement.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { institutionName: 'asc' },
    });
  }

  async createAgreement(companyId: string, data: {
    institutionName: string;
    logo?: string;
    description: string;
    benefits: string[];
    contact?: string;
    url?: string;
  }) {
    return this.prisma.companyAgreement.create({
      data: {
        companyId,
        institutionName: data.institutionName,
        logo: data.logo,
        description: data.description,
        benefits: data.benefits,
        contact: data.contact,
        url: data.url,
      },
    });
  }

  // =====================================
  // RECOGNITIONS
  // =====================================

  async getMyRecognitions(employeeId: string) {
    return this.prisma.recognition.findMany({
      where: { employeeId },
      include: {
        givenBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobPosition: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyRecognitions(companyId: string, limit = 20) {
    return this.prisma.recognition.findMany({
      where: {
        companyId,
        isPublic: true,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        givenBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async giveRecognition(data: {
    companyId: string;
    employeeId: string;
    givenById: string;
    type: string;
    title: string;
    message: string;
    points?: number;
    isPublic?: boolean;
  }) {
    return this.prisma.recognition.create({
      data: {
        companyId: data.companyId,
        employeeId: data.employeeId,
        givenById: data.givenById,
        type: data.type as any,
        title: data.title,
        message: data.message,
        points: data.points || 0,
        isPublic: data.isPublic ?? true,
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
        givenBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async getEmployeePoints(employeeId: string) {
    const recognitions = await this.prisma.recognition.aggregate({
      where: { employeeId },
      _sum: { points: true },
    });

    const badges = await this.prisma.employeeBadge.findMany({
      where: { employeeId },
      include: { badge: true },
    });

    const badgePoints = badges.reduce((sum, eb) => sum + (eb.badge.points || 0), 0);

    const courses = await this.prisma.courseEnrollment.findMany({
      where: { employeeId, status: 'COMPLETED' },
      include: { course: true },
    });

    const coursePoints = courses.reduce((sum, ce) => sum + (ce.course.points || 0), 0);

    return {
      recognitionPoints: recognitions._sum.points || 0,
      badgePoints,
      coursePoints,
      totalPoints: (recognitions._sum.points || 0) + badgePoints + coursePoints,
    };
  }

  // =====================================
  // COURSES
  // =====================================

  async getAvailableCourses(companyId: string) {
    return this.prisma.course.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: [{ isMandatory: 'desc' }, { title: 'asc' }],
    });
  }

  async getMyCourses(employeeId: string) {
    return this.prisma.courseEnrollment.findMany({
      where: { employeeId },
      include: {
        course: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async enrollInCourse(employeeId: string, courseId: string) {
    const existing = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_employeeId: { courseId, employeeId },
      },
    });

    if (existing) {
      throw new BadRequestException('Ya estás inscrito en este curso');
    }

    return this.prisma.courseEnrollment.create({
      data: {
        courseId,
        employeeId,
        status: 'NOT_STARTED',
      },
      include: { course: true },
    });
  }

  async updateCourseProgress(employeeId: string, courseId: string, progress: number) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_employeeId: { courseId, employeeId },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('No estás inscrito en este curso');
    }

    const status = progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

    return this.prisma.courseEnrollment.update({
      where: {
        courseId_employeeId: { courseId, employeeId },
      },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        status: status as any,
        startedAt: enrollment.startedAt || (progress > 0 ? new Date() : null),
        completedAt: progress >= 100 ? new Date() : null,
      },
      include: { course: true },
    });
  }

  async createCourse(companyId: string, data: {
    title: string;
    description: string;
    provider?: string;
    category: string;
    duration?: string;
    url?: string;
    imageUrl?: string;
    points?: number;
    isMandatory?: boolean;
  }) {
    return this.prisma.course.create({
      data: {
        companyId,
        title: data.title,
        description: data.description,
        provider: data.provider,
        category: data.category as any,
        duration: data.duration,
        url: data.url,
        imageUrl: data.imageUrl,
        points: data.points || 0,
        isMandatory: data.isMandatory || false,
      },
    });
  }

  // =====================================
  // BADGES
  // =====================================

  async getCompanyBadges(companyId: string) {
    return this.prisma.badge.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getMyBadges(employeeId: string) {
    return this.prisma.employeeBadge.findMany({
      where: { employeeId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async awardBadge(employeeId: string, badgeId: string, reason?: string) {
    const existing = await this.prisma.employeeBadge.findUnique({
      where: {
        badgeId_employeeId: { badgeId, employeeId },
      },
    });

    if (existing) {
      throw new BadRequestException('El empleado ya tiene esta insignia');
    }

    return this.prisma.employeeBadge.create({
      data: {
        badgeId,
        employeeId,
        reason,
      },
      include: { badge: true },
    });
  }

  async createBadge(companyId: string, data: {
    name: string;
    description: string;
    iconUrl?: string;
    color?: string;
    category: string;
    criteria?: string;
    points?: number;
  }) {
    return this.prisma.badge.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl,
        color: data.color || '#3B82F6',
        category: data.category as any,
        criteria: data.criteria,
        points: data.points || 0,
      },
    });
  }

  // =====================================
  // SURVEYS
  // =====================================

  async getAvailableSurveys(companyId: string, employeeId: string) {
    const now = new Date();

    const surveys = await this.prisma.survey.findMany({
      where: {
        companyId,
        isPublished: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
        responses: {
          where: { employeeId },
        },
      },
      orderBy: { startsAt: 'desc' },
    });

    // Add completion status
    return surveys.map(survey => ({
      ...survey,
      isCompleted: survey.responses.length > 0,
      totalQuestions: survey.questions.length,
    }));
  }

  async getSurveyDetails(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    return survey;
  }

  async submitSurveyResponse(surveyId: string, employeeId: string | null, answers: {
    questionId: string;
    answerText?: string;
    answerValue?: number;
    answerOption?: string;
  }[]) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });

    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    // Check if already responded
    if (employeeId) {
      const existing = await this.prisma.surveyResponse.findUnique({
        where: {
          surveyId_employeeId: { surveyId, employeeId },
        },
      });

      if (existing) {
        throw new BadRequestException('Ya has respondido esta encuesta');
      }
    }

    // Create response with answers
    return this.prisma.surveyResponse.create({
      data: {
        surveyId,
        employeeId: survey.isAnonymous ? null : employeeId,
        answers: {
          create: answers.map(answer => ({
            questionId: answer.questionId,
            answerText: answer.answerText,
            answerValue: answer.answerValue,
            answerOption: answer.answerOption,
          })),
        },
      },
      include: {
        answers: true,
      },
    });
  }

  async createSurvey(companyId: string, data: {
    title: string;
    description?: string;
    type: string;
    startsAt: Date;
    endsAt?: Date;
    isAnonymous?: boolean;
    targetAudience?: string;
    createdById?: string;
    questions: {
      questionText: string;
      type: string;
      options?: any;
      isRequired?: boolean;
    }[];
  }) {
    return this.prisma.survey.create({
      data: {
        companyId,
        title: data.title,
        description: data.description,
        type: data.type as any,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isAnonymous: data.isAnonymous ?? true,
        targetAudience: data.targetAudience,
        createdById: data.createdById,
        isPublished: false,
        questions: {
          create: data.questions.map((q, index) => ({
            questionText: q.questionText,
            type: q.type as any,
            options: q.options,
            isRequired: q.isRequired ?? true,
            orderIndex: index,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async publishSurvey(surveyId: string) {
    return this.prisma.survey.update({
      where: { id: surveyId },
      data: { isPublished: true },
    });
  }

  async getSurveyResults(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          include: {
            answers: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        responses: true,
      },
    });

    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    return {
      survey,
      totalResponses: survey.responses.length,
      questionResults: survey.questions.map(q => ({
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        totalAnswers: q.answers.length,
        // For rating questions, calculate average
        averageRating: q.type === 'RATING' || q.type === 'SCALE'
          ? q.answers.reduce((sum, a) => sum + (a.answerValue || 0), 0) / (q.answers.length || 1)
          : null,
        // For multiple choice, count each option
        optionCounts: q.type === 'MULTIPLE_CHOICE' || q.type === 'YES_NO'
          ? q.answers.reduce((acc, a) => {
              const opt = a.answerOption || 'N/A';
              acc[opt] = (acc[opt] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          : null,
      })),
    };
  }

  // =====================================
  // EMPLOYEE BENEFITS (existing module integration)
  // =====================================

  async getMyBenefits(employeeId: string) {
    return this.prisma.employeeBenefit.findMany({
      where: {
        employeeId,
        isActive: true,
      },
      include: {
        benefit: true,
      },
    });
  }
}

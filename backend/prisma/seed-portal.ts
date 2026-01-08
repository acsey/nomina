import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos del portal del empleado...');

  // Get the first company
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('❌ No hay empresa registrada. Ejecuta el seed principal primero.');
    return;
  }

  console.log(`📦 Usando empresa: ${company.name}`);

  // Get some employees for relations
  const employees = await prisma.employee.findMany({
    where: { companyId: company.id },
    take: 10,
  });

  if (employees.length === 0) {
    console.log('❌ No hay empleados registrados. Ejecuta el seed principal primero.');
    return;
  }

  // ============================================
  // DESCUENTOS CORPORATIVOS
  // ============================================
  console.log('🏷️ Creando descuentos corporativos...');

  const discountsData = [
    {
      companyId: company.id,
      partnerCompany: 'Gimnasio FitLife',
      description: 'Descuento en membresía mensual para empleados y familia',
      discount: '30%',
      category: 'HEALTH' as const,
      url: 'https://fitlife.com',
      validUntil: new Date('2026-12-31'),
    },
    {
      companyId: company.id,
      partnerCompany: 'Óptica Visión',
      description: 'Descuento en lentes y consultas oftalmológicas',
      discount: '25%',
      category: 'HEALTH' as const,
      code: 'EMP2026',
    },
    {
      companyId: company.id,
      partnerCompany: 'Universidad TecMilenio',
      description: 'Descuento en colegiaturas de licenciatura y maestría',
      discount: '20%',
      category: 'EDUCATION' as const,
      url: 'https://tecmilenio.mx',
    },
    {
      companyId: company.id,
      partnerCompany: 'Cine Cinemex',
      description: 'Boletos a precio especial todos los días',
      discount: '2x1 Miércoles',
      category: 'ENTERTAINMENT' as const,
      code: 'CORP2026',
    },
    {
      companyId: company.id,
      partnerCompany: 'Restaurante La Casa',
      description: 'Descuento en consumo presentando credencial',
      discount: '15%',
      category: 'FOOD' as const,
      validUntil: new Date('2026-06-30'),
    },
    {
      companyId: company.id,
      partnerCompany: 'Agencia de Viajes Mundo',
      description: 'Descuento en paquetes vacacionales nacionales e internacionales',
      discount: '10%',
      category: 'TRAVEL' as const,
      url: 'https://agenciamundo.com',
    },
    {
      companyId: company.id,
      partnerCompany: 'Liverpool',
      description: 'Tarjeta de crédito con descuentos exclusivos',
      discount: '15% primera compra',
      category: 'RETAIL' as const,
      code: 'NOMINA2026',
    },
    {
      companyId: company.id,
      partnerCompany: 'Farmacia del Ahorro',
      description: 'Descuento en medicamentos y productos de salud',
      discount: '10%',
      category: 'HEALTH' as const,
    },
  ];

  for (const discount of discountsData) {
    await prisma.companyDiscount.upsert({
      where: { id: `discount-${discount.partnerCompany.replace(/\s/g, '-').toLowerCase()}` },
      update: discount,
      create: {
        id: `discount-${discount.partnerCompany.replace(/\s/g, '-').toLowerCase()}`,
        ...discount,
      },
    });
  }

  // ============================================
  // CONVENIOS INSTITUCIONALES
  // ============================================
  console.log('🤝 Creando convenios institucionales...');

  const agreementsData = [
    {
      companyId: company.id,
      institutionName: 'FONACOT',
      description: 'Créditos para trabajadores formales con descuento vía nómina',
      benefits: ['Tasa preferencial', 'Descuento vía nómina', 'Aprobación rápida', 'Sin aval'],
      url: 'https://fonacot.gob.mx',
    },
    {
      companyId: company.id,
      institutionName: 'INFONAVIT',
      description: 'Crédito para vivienda y mejoras del hogar',
      benefits: ['Puntos acumulados', 'Subcuenta de vivienda', 'Asesoría gratuita', 'Múltiples esquemas'],
      contact: 'rh@empresa.com',
    },
    {
      companyId: company.id,
      institutionName: 'Caja de Ahorro Empresarial',
      description: 'Programa de ahorro y préstamos internos',
      benefits: ['Préstamos al 1% mensual', 'Ahorro con rendimientos', 'Sin buró de crédito', 'Ahorro voluntario'],
      contact: 'caja.ahorro@empresa.com',
    },
    {
      companyId: company.id,
      institutionName: 'Seguro MetLife',
      description: 'Seguro de gastos médicos mayores y vida',
      benefits: ['Cobertura familiar', 'Red de hospitales amplia', 'Asistencia 24/7', 'Check-ups anuales'],
      url: 'https://metlife.com.mx',
    },
  ];

  for (const agreement of agreementsData) {
    await prisma.companyAgreement.upsert({
      where: { id: `agreement-${agreement.institutionName.replace(/\s/g, '-').toLowerCase()}` },
      update: agreement,
      create: {
        id: `agreement-${agreement.institutionName.replace(/\s/g, '-').toLowerCase()}`,
        ...agreement,
      },
    });
  }

  // ============================================
  // BADGES / INSIGNIAS
  // ============================================
  console.log('🏆 Creando insignias...');

  const badgesData = [
    {
      companyId: company.id,
      name: 'Primer Año',
      description: 'Completaste tu primer año en la empresa',
      color: '#10B981',
      category: 'MILESTONE' as const,
      criteria: 'Cumplir 1 año de antigüedad',
      points: 100,
    },
    {
      companyId: company.id,
      name: 'Cinco Años',
      description: 'Cinco años de compromiso y dedicación',
      color: '#3B82F6',
      category: 'MILESTONE' as const,
      criteria: 'Cumplir 5 años de antigüedad',
      points: 500,
    },
    {
      companyId: company.id,
      name: 'Diez Años',
      description: 'Una década de lealtad y excelencia',
      color: '#F59E0B',
      category: 'MILESTONE' as const,
      criteria: 'Cumplir 10 años de antigüedad',
      points: 1000,
    },
    {
      companyId: company.id,
      name: 'Asistencia Perfecta',
      description: 'Sin faltas durante el trimestre',
      color: '#8B5CF6',
      category: 'ACHIEVEMENT' as const,
      criteria: 'Cero faltas en 3 meses consecutivos',
      points: 150,
    },
    {
      companyId: company.id,
      name: 'Capacitación Completa',
      description: 'Completaste todos los cursos obligatorios',
      color: '#EC4899',
      category: 'TRAINING' as const,
      criteria: 'Completar 100% de cursos obligatorios',
      points: 200,
    },
    {
      companyId: company.id,
      name: 'Innovador',
      description: 'Propuesta de mejora implementada',
      color: '#06B6D4',
      category: 'RECOGNITION' as const,
      criteria: 'Proponer una mejora que se implemente',
      points: 300,
    },
    {
      companyId: company.id,
      name: 'Líder Ejemplar',
      description: 'Reconocido como líder por su equipo',
      color: '#EF4444',
      category: 'PERFORMANCE' as const,
      criteria: 'Evaluación de liderazgo superior al 90%',
      points: 400,
    },
    {
      companyId: company.id,
      name: 'Estrella del Mes',
      description: 'Empleado destacado del mes',
      color: '#F97316',
      category: 'SPECIAL' as const,
      criteria: 'Seleccionado como empleado del mes',
      points: 250,
    },
  ];

  const badges = [];
  for (const badge of badgesData) {
    const created = await prisma.badge.upsert({
      where: { id: `badge-${badge.name.replace(/\s/g, '-').toLowerCase()}` },
      update: badge,
      create: {
        id: `badge-${badge.name.replace(/\s/g, '-').toLowerCase()}`,
        ...badge,
      },
    });
    badges.push(created);
  }

  // ============================================
  // CURSOS
  // ============================================
  console.log('📚 Creando cursos...');

  const coursesData = [
    {
      companyId: company.id,
      title: 'Inducción a la Empresa',
      description: 'Conoce la historia, misión, visión y valores de la empresa. Incluye políticas internas y código de conducta.',
      provider: 'Recursos Humanos',
      category: 'ONBOARDING' as const,
      duration: '4 horas',
      points: 50,
      isMandatory: true,
    },
    {
      companyId: company.id,
      title: 'Seguridad e Higiene en el Trabajo',
      description: 'Capacitación obligatoria sobre protocolos de seguridad, uso de equipo de protección y prevención de accidentes.',
      provider: 'Seguridad Industrial',
      category: 'SAFETY' as const,
      duration: '3 horas',
      points: 75,
      isMandatory: true,
    },
    {
      companyId: company.id,
      title: 'Prevención de Lavado de Dinero',
      description: 'Cumplimiento normativo sobre prevención de lavado de dinero y financiamiento al terrorismo.',
      provider: 'Compliance',
      category: 'COMPLIANCE' as const,
      duration: '2 horas',
      points: 50,
      isMandatory: true,
    },
    {
      companyId: company.id,
      title: 'Excel Avanzado',
      description: 'Domina fórmulas avanzadas, tablas dinámicas, macros y análisis de datos en Excel.',
      provider: 'LinkedIn Learning',
      category: 'TECHNICAL' as const,
      duration: '8 horas',
      url: 'https://linkedin.com/learning',
      points: 100,
      isMandatory: false,
    },
    {
      companyId: company.id,
      title: 'Comunicación Efectiva',
      description: 'Mejora tus habilidades de comunicación verbal y escrita en el ambiente laboral.',
      provider: 'Desarrollo Organizacional',
      category: 'SOFT_SKILLS' as const,
      duration: '6 horas',
      points: 80,
      isMandatory: false,
    },
    {
      companyId: company.id,
      title: 'Liderazgo y Gestión de Equipos',
      description: 'Desarrolla competencias de liderazgo para gestionar equipos de alto rendimiento.',
      provider: 'Harvard Business School Online',
      category: 'LEADERSHIP' as const,
      duration: '20 horas',
      points: 200,
      isMandatory: false,
    },
    {
      companyId: company.id,
      title: 'Inglés Empresarial',
      description: 'Curso de inglés enfocado en el ambiente de negocios y comunicación profesional.',
      provider: 'Berlitz',
      category: 'LANGUAGE' as const,
      duration: '40 horas',
      points: 300,
      isMandatory: false,
    },
    {
      companyId: company.id,
      title: 'Certificación ISO 9001',
      description: 'Preparación para la certificación en gestión de calidad ISO 9001:2015.',
      provider: 'Bureau Veritas',
      category: 'CERTIFICATION' as const,
      duration: '16 horas',
      points: 250,
      isMandatory: false,
    },
  ];

  const courses = [];
  for (const course of coursesData) {
    const created = await prisma.course.upsert({
      where: { id: `course-${course.title.replace(/\s/g, '-').toLowerCase().slice(0, 30)}` },
      update: course,
      create: {
        id: `course-${course.title.replace(/\s/g, '-').toLowerCase().slice(0, 30)}`,
        ...course,
      },
    });
    courses.push(created);
  }

  // ============================================
  // ENCUESTAS
  // ============================================
  console.log('📋 Creando encuestas...');

  // Survey 1: Clima Laboral
  const climaSurvey = await prisma.survey.upsert({
    where: { id: 'survey-clima-laboral-2026' },
    update: {},
    create: {
      id: 'survey-clima-laboral-2026',
      companyId: company.id,
      title: 'Encuesta de Clima Laboral 2026',
      description: 'Tu opinión es importante para nosotros. Esta encuesta nos ayuda a mejorar el ambiente de trabajo.',
      type: 'CLIMATE',
      startsAt: new Date(),
      endsAt: new Date('2026-03-31'),
      isAnonymous: true,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: '¿Qué tan satisfecho estás con tu ambiente de trabajo?',
            type: 'RATING',
            isRequired: true,
            orderIndex: 0,
          },
          {
            questionText: '¿Sientes que tu trabajo es valorado por la empresa?',
            type: 'RATING',
            isRequired: true,
            orderIndex: 1,
          },
          {
            questionText: '¿Cómo calificarías la comunicación con tu supervisor?',
            type: 'RATING',
            isRequired: true,
            orderIndex: 2,
          },
          {
            questionText: '¿Te sientes parte de un equipo?',
            type: 'YES_NO',
            isRequired: true,
            orderIndex: 3,
          },
          {
            questionText: '¿Qué aspectos mejorarías de tu área de trabajo?',
            type: 'TEXT',
            isRequired: false,
            orderIndex: 4,
          },
        ],
      },
    },
  });

  // Survey 2: Satisfacción con Beneficios
  const benefitsSurvey = await prisma.survey.upsert({
    where: { id: 'survey-beneficios-2026' },
    update: {},
    create: {
      id: 'survey-beneficios-2026',
      companyId: company.id,
      title: 'Satisfacción con Prestaciones',
      description: 'Queremos conocer tu opinión sobre las prestaciones que ofrecemos.',
      type: 'SATISFACTION',
      startsAt: new Date(),
      endsAt: new Date('2026-02-28'),
      isAnonymous: true,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: '¿Qué tan satisfecho estás con las prestaciones actuales?',
            type: 'RATING',
            isRequired: true,
            orderIndex: 0,
          },
          {
            questionText: '¿Cuál prestación valoras más?',
            type: 'MULTIPLE_CHOICE',
            options: ['Vales de despensa', 'Fondo de ahorro', 'Seguro de gastos médicos', 'Días de vacaciones', 'Otro'],
            isRequired: true,
            orderIndex: 1,
          },
          {
            questionText: '¿Recomendarías trabajar en esta empresa a un amigo?',
            type: 'YES_NO',
            isRequired: true,
            orderIndex: 2,
          },
          {
            questionText: '¿Qué prestación adicional te gustaría que se incluyera?',
            type: 'TEXT',
            isRequired: false,
            orderIndex: 3,
          },
        ],
      },
    },
  });

  // Survey 3: Pulse rápido
  const pulseSurvey = await prisma.survey.upsert({
    where: { id: 'survey-pulse-enero-2026' },
    update: {},
    create: {
      id: 'survey-pulse-enero-2026',
      companyId: company.id,
      title: 'Pulso Semanal - Enero',
      description: 'Encuesta rápida para conocer cómo te sientes esta semana.',
      type: 'PULSE',
      startsAt: new Date(),
      endsAt: new Date('2026-01-31'),
      isAnonymous: true,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: 'Del 1 al 10, ¿cómo te sentiste esta semana en el trabajo?',
            type: 'SCALE',
            isRequired: true,
            orderIndex: 0,
          },
          {
            questionText: '¿Tienes todo lo necesario para hacer bien tu trabajo?',
            type: 'YES_NO',
            isRequired: true,
            orderIndex: 1,
          },
        ],
      },
    },
  });

  // ============================================
  // ASIGNAR DATOS A EMPLEADOS
  // ============================================
  if (employees.length > 0) {
    console.log('👥 Asignando datos a empleados...');

    // Assign badges to some employees
    for (let i = 0; i < Math.min(3, employees.length); i++) {
      const employee = employees[i];
      const badge = badges[i % badges.length];

      try {
        await prisma.employeeBadge.upsert({
          where: {
            badgeId_employeeId: {
              badgeId: badge.id,
              employeeId: employee.id,
            },
          },
          update: {},
          create: {
            badgeId: badge.id,
            employeeId: employee.id,
            reason: 'Asignado automáticamente',
          },
        });
      } catch (e) {
        // Ignore if already exists
      }
    }

    // Enroll employees in mandatory courses
    for (const employee of employees.slice(0, 5)) {
      for (const course of courses.filter(c => c.isMandatory)) {
        try {
          await prisma.courseEnrollment.upsert({
            where: {
              courseId_employeeId: {
                courseId: course.id,
                employeeId: employee.id,
              },
            },
            update: {},
            create: {
              courseId: course.id,
              employeeId: employee.id,
              status: 'NOT_STARTED',
              progress: 0,
            },
          });
        } catch (e) {
          // Ignore if already exists
        }
      }
    }

    // Create some recognitions
    if (employees.length >= 2) {
      const recognitionsData = [
        {
          companyId: company.id,
          employeeId: employees[0].id,
          givenById: employees[1].id,
          type: 'TEAMWORK' as const,
          title: 'Excelente trabajo en equipo',
          message: 'Gracias por tu colaboración en el proyecto Q4. Tu apoyo fue fundamental para el éxito del equipo.',
          points: 50,
          isPublic: true,
        },
        {
          companyId: company.id,
          employeeId: employees[1].id,
          givenById: employees[0].id,
          type: 'EXCELLENCE' as const,
          title: 'Atención al detalle',
          message: 'Tu dedicación y atención al detalle en la revisión de documentos evitó errores importantes. ¡Gracias!',
          points: 75,
          isPublic: true,
        },
      ];

      for (const recognition of recognitionsData) {
        try {
          await prisma.recognition.create({
            data: recognition,
          });
        } catch (e) {
          // Ignore duplicates
        }
      }
    }
  }

  console.log('✅ Seed del portal del empleado completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

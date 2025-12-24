import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';

// Helper to create a heading paragraph
const createHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) => {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
  });
};

// Helper to create a normal paragraph
const createParagraph = (text: string, options?: { bold?: boolean; spacing?: boolean }) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
      }),
    ],
    spacing: options?.spacing ? { before: 200, after: 200 } : undefined,
  });
};

// Helper to create a bullet list
const createBulletList = (items: string[]) => {
  return items.map(
    (item) =>
      new Paragraph({
        text: item,
        bullet: { level: 0 },
        spacing: { before: 100, after: 100 },
      })
  );
};

// Helper to create a numbered list
const createNumberedList = (items: string[]) => {
  return items.map(
    (item, index) =>
      new Paragraph({
        children: [new TextRun({ text: `${index + 1}. ${item}` })],
        spacing: { before: 100, after: 100 },
      })
  );
};

// Helper to create a simple table
const createTable = (headers: string[], rows: string[][]) => {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '999999',
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: 'E8E8E8' },
              borders: {
                top: borderStyle,
                bottom: borderStyle,
                left: borderStyle,
                right: borderStyle,
              },
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ text: cell })],
                  borders: {
                    top: borderStyle,
                    bottom: borderStyle,
                    left: borderStyle,
                    right: borderStyle,
                  },
                })
            ),
          })
      ),
    ],
  });
};

// Generate Administrator Manual
export const generateAdminManual = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          createHeading('Manual de Usuario - Administrador del Sistema', HeadingLevel.TITLE),

          createHeading('1. Introduccion', HeadingLevel.HEADING_1),
          createHeading('1.1 Rol de Administrador', HeadingLevel.HEADING_2),
          createParagraph('Como administrador del sistema, tienes acceso completo a todas las funcionalidades:'),
          ...createBulletList([
            'Gestion de empresas y usuarios',
            'Configuracion global del sistema',
            'Acceso a todos los modulos',
            'Supervision de todas las operaciones',
          ]),

          createHeading('1.2 Responsabilidades Clave', HeadingLevel.HEADING_2),
          ...createBulletList([
            'Configuracion inicial del sistema',
            'Gestion de accesos y permisos',
            'Configuracion de certificados digitales',
            'Monitoreo del sistema',
          ]),

          createHeading('2. Configuracion Inicial', HeadingLevel.HEADING_1),
          createHeading('2.1 Primera Configuracion', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Acceder al sistema con credenciales de administrador',
            'Ir a Config. Sistema > Verificar configuracion global',
            'Ir a Config. Empresa > Configurar datos de la empresa',
          ]),

          createHeading('2.2 Configurar Modo Multiempresa', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Config. Sistema',
            'En la seccion "General", localizar "MULTI COMPANY ENABLED"',
            'Activar si gestionara multiples empresas',
            'Desactivar si es sistema de empresa unica',
            'Guardar cambios',
          ]),

          createHeading('3. Gestion de Empresas', HeadingLevel.HEADING_1),
          createHeading('3.1 Crear Nueva Empresa', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Empresas',
            'Clic en "Nueva Empresa"',
            'Completar datos obligatorios: Nombre comercial, RFC, Registro patronal IMSS, Direccion',
            'Guardar',
          ]),

          createHeading('3.2 Configurar Certificados Digitales', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Config. Empresa > pestana CFDI',
            'Subir Certificado (.cer) y Llave privada (.key) del SAT',
            'Ingresar la contrasena de la llave',
            'El sistema validara la vigencia',
            'Guardar configuracion',
          ]),

          createHeading('4. Gestion de Usuarios', HeadingLevel.HEADING_1),
          createHeading('4.1 Crear Usuario', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Usuarios',
            'Clic en "Nuevo Usuario"',
            'Completar: Nombre, apellidos, correo electronico, contrasena temporal, rol y empresa',
            'Guardar',
          ]),

          createHeading('4.2 Roles Disponibles', HeadingLevel.HEADING_2),
          createTable(
            ['Rol', 'Accesos'],
            [
              ['admin', 'Acceso total al sistema'],
              ['company_admin', 'Administrador de empresa especifica'],
              ['rh', 'Recursos Humanos (nomina, empleados)'],
              ['manager', 'Supervisor (asistencia, vacaciones)'],
              ['employee', 'Solo portal personal'],
            ]
          ),

          createHeading('5. Configuracion del Sistema', HeadingLevel.HEADING_1),
          createHeading('5.1 Acceso a Configuracion Global', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Config. Sistema',
            'Solo visible para rol admin',
          ]),

          createHeading('5.2 Opciones Disponibles', HeadingLevel.HEADING_2),
          createParagraph('General:', { bold: true }),
          ...createBulletList([
            'MULTI_COMPANY_ENABLED: Modo multiempresa',
            'SYSTEM_NAME: Nombre mostrado en UI',
            'DEFAULT_LANGUAGE: Idioma del sistema',
          ]),

          createHeading('6. Resolucion de Problemas', HeadingLevel.HEADING_1),
          createHeading('6.1 Usuarios No Pueden Acceder', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Verificar que el usuario este activo',
            'Verificar que tenga empresa asignada',
            'Restablecer contrasena si es necesario',
          ]),

          createHeading('6.2 Error en Timbrado CFDI', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Verificar certificados no expirados',
            'Verificar credenciales PAC',
            'Verificar modo (sandbox vs produccion)',
            'Revisar logs del sistema',
          ]),

          createParagraph(''),
          createParagraph('Manual de Administrador v1.0', { bold: true }),
          createParagraph('Ultima actualizacion: Diciembre 2024'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Manual-Administrador.docx');
};

// Generate HR Manual
export const generateHRManual = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          createHeading('Manual de Usuario - Recursos Humanos', HeadingLevel.TITLE),

          createHeading('1. Introduccion', HeadingLevel.HEADING_1),
          createHeading('1.1 Rol de Recursos Humanos', HeadingLevel.HEADING_2),
          createParagraph('Como usuario de Recursos Humanos tienes acceso a:'),
          ...createBulletList([
            'Gestion completa de empleados',
            'Procesamiento de nomina',
            'Administracion de incidencias',
            'Control de asistencia',
            'Gestion de vacaciones y beneficios',
            'Generacion de reportes',
          ]),

          createHeading('2. Gestion de Empleados', HeadingLevel.HEADING_1),
          createHeading('2.1 Crear Nuevo Empleado', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Clic en "Nuevo Empleado"',
            'Completar datos personales (Nombre, CURP, RFC, NSS)',
            'Completar datos laborales (Fecha ingreso, Departamento, Puesto)',
            'Configurar datos de nomina (Salario, Metodo de pago)',
            'Guardar',
          ]),

          createHeading('2.2 Editar Empleado', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Buscar empleado en la lista',
            'Clic en el icono de edicion',
            'Modificar datos necesarios',
            'Guardar cambios',
          ]),

          createHeading('2.3 Dar de Baja Empleado', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Abrir detalle del empleado',
            'Clic en "Dar de Baja"',
            'Seleccionar motivo de baja',
            'Ingresar fecha de baja',
            'Confirmar operacion',
          ]),

          createHeading('3. Procesamiento de Nomina', HeadingLevel.HEADING_1),
          createHeading('3.1 Tipos de Nomina', HeadingLevel.HEADING_2),
          ...createBulletList([
            'Ordinaria: Nomina regular del periodo',
            'Extraordinaria: Aguinaldo, PTU, finiquitos',
          ]),

          createHeading('3.2 Crear Nueva Nomina', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Nomina',
            'Clic en "Nueva Nomina"',
            'Seleccionar tipo, periodo y fechas',
            'Clic en Crear',
          ]),

          createHeading('3.3 Procesar Nomina', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Verificar que toda la informacion este correcta',
            'Clic en "Procesar Nomina"',
            'El sistema calculara ISR, IMSS, Subsidio y Neto',
            'Confirmar procesamiento',
          ]),

          createHeading('3.4 Timbrar CFDI', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Con la nomina procesada',
            'Clic en "Timbrar Recibos"',
            'El sistema genera XML y envia al PAC',
            'Verificar que todos tengan UUID',
          ]),

          createHeading('4. Incidencias', HeadingLevel.HEADING_1),
          createHeading('4.1 Tipos de Incidencias', HeadingLevel.HEADING_2),
          createTable(
            ['Tipo', 'Descripcion'],
            [
              ['Falta', 'Ausencia no justificada'],
              ['Retardo', 'Llegada tarde'],
              ['Incapacidad', 'Enfermedad/accidente'],
              ['Permiso', 'Ausencia autorizada'],
              ['Suspension', 'Sancion administrativa'],
            ]
          ),

          createHeading('4.2 Registrar Incidencia', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ir a Incidencias',
            'Clic en "Nueva Incidencia"',
            'Seleccionar empleado y tipo',
            'Ingresar fechas y observaciones',
            'Guardar',
          ]),

          createHeading('5. Vacaciones', HeadingLevel.HEADING_1),
          createHeading('5.1 Dias de Vacaciones por Antiguedad', HeadingLevel.HEADING_2),
          createTable(
            ['Anos trabajados', 'Dias de vacaciones'],
            [
              ['1 ano', '12 dias'],
              ['2 anos', '14 dias'],
              ['3 anos', '16 dias'],
              ['4 anos', '18 dias'],
              ['5 anos', '20 dias'],
              ['6-10 anos', '22 dias'],
            ]
          ),

          createHeading('5.2 Aprobar/Rechazar Solicitudes', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ver solicitudes pendientes en Vacaciones',
            'Revisar detalles de la solicitud',
            'Clic en "Aprobar" o "Rechazar"',
            'Si rechaza, agregar motivo',
          ]),

          createHeading('6. Reportes', HeadingLevel.HEADING_1),
          createHeading('6.1 Reportes Disponibles', HeadingLevel.HEADING_2),
          createTable(
            ['Reporte', 'Descripcion'],
            [
              ['Plantilla', 'Lista de empleados activos'],
              ['Nomina', 'Detalle de pagos por periodo'],
              ['Acumulados', 'Percepciones/deducciones anuales'],
              ['Asistencia', 'Registros de entrada/salida'],
              ['Vacaciones', 'Saldos y periodos tomados'],
            ]
          ),

          createParagraph(''),
          createParagraph('Manual de Usuario RH v1.0', { bold: true }),
          createParagraph('Ultima actualizacion: Diciembre 2024'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Manual-Recursos-Humanos.docx');
};

// Generate Employee Manual
export const generateEmployeeManual = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          createHeading('Manual de Usuario - Portal del Empleado', HeadingLevel.TITLE),

          createHeading('1. Introduccion', HeadingLevel.HEADING_1),
          createHeading('1.1 Que es el Portal del Empleado?', HeadingLevel.HEADING_2),
          createParagraph('El Portal del Empleado es tu espacio personal donde puedes:'),
          ...createBulletList([
            'Consultar tus recibos de nomina',
            'Ver tu informacion personal',
            'Solicitar vacaciones',
            'Consultar tu historial de asistencia',
            'Descargar documentos importantes',
          ]),

          createHeading('1.2 Acceso al Portal', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Ingresa a la direccion web del sistema',
            'Escribe tu correo electronico',
            'Escribe tu contrasena',
            'Clic en "Iniciar Sesion"',
          ]),

          createHeading('2. Mis Recibos de Nomina', HeadingLevel.HEADING_1),
          createHeading('2.1 Ver Recibos', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Haz clic en "Mis Recibos" en el menu',
            'Veras la lista de recibos ordenados por fecha',
            'Cada recibo muestra: Periodo, Fecha de pago, Tipo, Neto',
          ]),

          createHeading('2.2 Descargar Recibo', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Clic en el recibo que deseas ver',
            'Clic en "Descargar PDF" para obtener el recibo',
            'Clic en "Descargar XML" para el CFDI',
          ]),

          createHeading('3. Mis Vacaciones', HeadingLevel.HEADING_1),
          createHeading('3.1 Dias de Vacaciones', HeadingLevel.HEADING_2),
          createParagraph('Segun la Ley Federal del Trabajo, los dias de vacaciones se calculan por antiguedad:'),
          createTable(
            ['Anos trabajados', 'Dias de vacaciones'],
            [
              ['1 ano', '12 dias'],
              ['2 anos', '14 dias'],
              ['3 anos', '16 dias'],
              ['4 anos', '18 dias'],
              ['5 anos', '20 dias'],
            ]
          ),

          createHeading('3.2 Solicitar Vacaciones', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Clic en "Nueva Solicitud"',
            'Selecciona la fecha de inicio',
            'Selecciona la fecha de fin',
            'Agrega un comentario si es necesario',
            'Clic en "Enviar Solicitud"',
          ]),

          createHeading('3.3 Estados de Solicitud', HeadingLevel.HEADING_2),
          createTable(
            ['Estado', 'Significado'],
            [
              ['Pendiente', 'Esperando aprobacion'],
              ['Aprobada', 'Tu solicitud fue aceptada'],
              ['Rechazada', 'No fue autorizada'],
            ]
          ),

          createHeading('4. Mi Asistencia', HeadingLevel.HEADING_1),
          createHeading('4.1 Ver Registros', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Clic en "Mi Asistencia"',
            'Veras tu historial de registros',
            'Puedes filtrar por fechas',
          ]),

          createHeading('4.2 Resumen del Mes', HeadingLevel.HEADING_2),
          createParagraph('En la parte superior veras:'),
          ...createBulletList([
            'Dias trabajados',
            'Faltas (si las hay)',
            'Retardos (si los hay)',
            'Horas extra (si aplica)',
          ]),

          createHeading('5. Preguntas Frecuentes', HeadingLevel.HEADING_1),

          createParagraph('P: No encuentro un recibo de nomina', { bold: true }),
          createParagraph('R: Verifica el filtro de ano. Si no aparece, contacta a RH.'),

          createParagraph('P: Mi solicitud de vacaciones fue rechazada', { bold: true }),
          createParagraph('R: Contacta a tu supervisor para conocer el motivo y buscar fechas alternativas.'),

          createParagraph('P: Hay un error en mi registro de asistencia', { bold: true }),
          createParagraph('R: Contacta a RH con la fecha afectada para que hagan la correccion.'),

          createHeading('6. Consejos de Seguridad', HeadingLevel.HEADING_1),
          ...createBulletList([
            'No compartas tu contrasena con nadie',
            'Cierra sesion al terminar de usar el sistema',
            'No uses computadoras publicas para acceder',
            'Cambia tu contrasena periodicamente',
          ]),

          createParagraph(''),
          createParagraph('Manual del Portal del Empleado v1.0', { bold: true }),
          createParagraph('Ultima actualizacion: Diciembre 2024'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Manual-Empleado.docx');
};

// Generate Technical Document
export const generateTechnicalDocument = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          createHeading('Documento Tecnico del Sistema de Nomina', HeadingLevel.TITLE),

          createHeading('1. Descripcion General', HeadingLevel.HEADING_1),
          createParagraph('Sistema integral de gestion de nomina para empresas mexicanas, disenado para cumplir con las regulaciones fiscales del SAT y las normativas laborales del IMSS.'),

          createHeading('1.1 Caracteristicas Principales', HeadingLevel.HEADING_2),
          ...createBulletList([
            'Gestion de empleados y departamentos',
            'Calculo automatico de nomina (ISR, IMSS, INFONAVIT)',
            'Generacion de CFDI 4.0 de nomina',
            'Control de asistencia e incidencias',
            'Gestion de vacaciones y prestaciones',
            'Reportes y dispersion bancaria',
          ]),

          createHeading('2. Arquitectura del Sistema', HeadingLevel.HEADING_1),
          createHeading('2.1 Stack Tecnologico', HeadingLevel.HEADING_2),
          createTable(
            ['Componente', 'Tecnologia'],
            [
              ['Frontend', 'React 18, TypeScript, TailwindCSS'],
              ['Backend', 'NestJS, TypeScript'],
              ['Base de Datos', 'PostgreSQL 15'],
              ['ORM', 'Prisma'],
              ['Autenticacion', 'JWT'],
              ['Contenedores', 'Docker'],
            ]
          ),

          createHeading('2.2 Estructura de Directorios', HeadingLevel.HEADING_2),
          createParagraph('/nomina'),
          ...createBulletList([
            '/backend - API NestJS',
            '/frontend - Aplicacion React',
            '/docs - Documentacion',
            'docker-compose.yml - Configuracion Docker',
          ]),

          createHeading('3. Modulos del Sistema', HeadingLevel.HEADING_1),
          createTable(
            ['Modulo', 'Funcionalidad'],
            [
              ['auth', 'Autenticacion y autorizacion JWT'],
              ['employees', 'Gestion de empleados'],
              ['payroll', 'Procesamiento de nomina'],
              ['attendance', 'Control de asistencia'],
              ['vacations', 'Solicitudes de vacaciones'],
              ['companies', 'Gestion multiempresa'],
              ['cfdi', 'Generacion y timbrado de CFDI'],
            ]
          ),

          createHeading('4. Base de Datos', HeadingLevel.HEADING_1),
          createHeading('4.1 Tablas Principales', HeadingLevel.HEADING_2),
          ...createBulletList([
            'users - Usuarios del sistema',
            'employees - Empleados',
            'companies - Empresas',
            'payroll_periods - Periodos de nomina',
            'payroll_receipts - Recibos de nomina',
            'attendance_records - Registros de asistencia',
            'vacation_requests - Solicitudes de vacaciones',
          ]),

          createHeading('5. APIs', HeadingLevel.HEADING_1),
          createParagraph('El backend expone APIs RESTful para todas las operaciones:'),
          ...createBulletList([
            'POST /auth/login - Autenticacion',
            'GET /employees - Listar empleados',
            'POST /payroll/calculate - Calcular nomina',
            'POST /cfdi/stamp - Timbrar recibos',
          ]),

          createHeading('6. Seguridad', HeadingLevel.HEADING_1),
          ...createBulletList([
            'Autenticacion JWT con refresh tokens',
            'Control de acceso basado en roles (RBAC)',
            'Encriptacion de contrasenas con bcrypt',
            'Certificados digitales encriptados en BD',
            'HTTPS obligatorio en produccion',
          ]),

          createParagraph(''),
          createParagraph('Documento Tecnico v1.0', { bold: true }),
          createParagraph('Ultima actualizacion: Diciembre 2024'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Documento-Tecnico.docx');
};

// Generate Deployment Document
export const generateDeploymentDocument = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          createHeading('Documento de Despliegue', HeadingLevel.TITLE),

          createHeading('1. Requisitos del Sistema', HeadingLevel.HEADING_1),
          createHeading('1.1 Requisitos de Hardware', HeadingLevel.HEADING_2),
          createTable(
            ['Componente', 'Minimo', 'Recomendado'],
            [
              ['CPU', '2 cores', '4 cores'],
              ['RAM', '4 GB', '8 GB'],
              ['Disco', '20 GB SSD', '50 GB SSD'],
            ]
          ),

          createHeading('1.2 Requisitos de Software', HeadingLevel.HEADING_2),
          ...createBulletList([
            'Docker 20.10+',
            'Docker Compose 2.0+',
            'O alternativamente: Node.js 18+, PostgreSQL 15+',
          ]),

          createHeading('2. Despliegue con Docker', HeadingLevel.HEADING_1),
          createHeading('2.1 Configuracion', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Clonar el repositorio',
            'Copiar .env.example a .env',
            'Configurar variables de entorno',
            'Ejecutar docker-compose up -d',
          ]),

          createHeading('2.2 Variables de Entorno', HeadingLevel.HEADING_2),
          createTable(
            ['Variable', 'Descripcion'],
            [
              ['DATABASE_URL', 'URL de conexion PostgreSQL'],
              ['JWT_SECRET', 'Clave secreta para JWT'],
              ['PAC_USER', 'Usuario del PAC'],
              ['PAC_PASSWORD', 'Contrasena del PAC'],
            ]
          ),

          createHeading('3. Despliegue Manual', HeadingLevel.HEADING_1),
          createHeading('3.1 Base de Datos', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Instalar PostgreSQL 15',
            'Crear base de datos "nomina"',
            'Crear usuario con permisos',
          ]),

          createHeading('3.2 Backend', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'cd backend && npm install',
            'npx prisma migrate deploy',
            'npx prisma db seed',
            'npm run build && npm run start:prod',
          ]),

          createHeading('3.3 Frontend', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'cd frontend && npm install',
            'npm run build',
            'Servir dist/ con Nginx',
          ]),

          createHeading('4. Verificacion', HeadingLevel.HEADING_1),
          ...createBulletList([
            'Acceder a la URL del frontend',
            'Iniciar sesion con admin@nomina.com / admin123',
            'Verificar que el dashboard carga correctamente',
          ]),

          createHeading('5. Mantenimiento', HeadingLevel.HEADING_1),
          createHeading('5.1 Respaldos', HeadingLevel.HEADING_2),
          createParagraph('Configurar respaldos automaticos de PostgreSQL diariamente.'),

          createHeading('5.2 Actualizaciones', HeadingLevel.HEADING_2),
          ...createNumberedList([
            'Detener contenedores',
            'Actualizar codigo (git pull)',
            'Reconstruir imagenes',
            'Ejecutar migraciones',
            'Reiniciar contenedores',
          ]),

          createParagraph(''),
          createParagraph('Documento de Despliegue v1.0', { bold: true }),
          createParagraph('Ultima actualizacion: Diciembre 2024'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Documento-Despliegue.docx');
};

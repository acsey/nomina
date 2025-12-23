import { useState } from 'react';
import {
  BookOpenIcon,
  UsersIcon,
  BanknotesIcon,
  ClockIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  content: HelpTopic[];
}

interface HelpTopic {
  title: string;
  content: string;
  steps?: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Primeros Pasos',
    icon: PlayCircleIcon,
    content: [
      {
        title: 'Inicio de Sesion',
        content: 'Para acceder al sistema, ingresa tu correo electronico y contrasena en la pantalla de inicio de sesion. Si olvidaste tu contrasena, contacta al administrador del sistema.',
        steps: [
          'Abre la aplicacion en tu navegador',
          'Ingresa tu correo electronico',
          'Ingresa tu contrasena',
          'Haz clic en "Iniciar Sesion"',
        ],
      },
      {
        title: 'Navegacion del Sistema',
        content: 'El menu lateral izquierdo te permite acceder a todas las funciones del sistema. Las opciones disponibles dependen de tu rol (Administrador, RH, Empleado).',
      },
      {
        title: 'Cambiar Contrasena',
        content: 'Por seguridad, te recomendamos cambiar tu contrasena periodicamente. Puedes hacerlo desde tu perfil de usuario.',
      },
    ],
  },
  {
    id: 'employees',
    title: 'Gestion de Empleados',
    icon: UsersIcon,
    content: [
      {
        title: 'Agregar Nuevo Empleado',
        content: 'Para registrar un nuevo empleado en el sistema, necesitas tener los datos personales, fiscales y laborales del trabajador.',
        steps: [
          'Ve a Empleados > Nuevo Empleado',
          'Completa los datos personales (nombre, RFC, CURP, etc.)',
          'Ingresa los datos laborales (fecha de ingreso, departamento, puesto)',
          'Configura el salario y metodo de pago',
          'Haz clic en "Guardar"',
        ],
      },
      {
        title: 'Editar Empleado',
        content: 'Puedes modificar la informacion de un empleado en cualquier momento. Los cambios de salario quedan registrados en el historial.',
        steps: [
          'Ve a Empleados y busca al empleado',
          'Haz clic en el icono de editar',
          'Modifica los campos necesarios',
          'Guarda los cambios',
        ],
      },
      {
        title: 'Dar de Baja a un Empleado',
        content: 'Cuando un empleado deja la empresa, debes registrar su baja con la fecha de terminacion. Esto afecta los calculos de finiquito.',
        steps: [
          'Abre el perfil del empleado',
          'Haz clic en "Dar de Baja"',
          'Selecciona la fecha de terminacion',
          'Confirma la baja',
        ],
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Procesamiento de Nomina',
    icon: BanknotesIcon,
    content: [
      {
        title: 'Crear Periodo de Nomina',
        content: 'Un periodo de nomina agrupa los pagos de un rango de fechas. Puedes crear periodos semanales, quincenales o mensuales.',
        steps: [
          'Ve a Nomina',
          'Haz clic en "Nuevo Periodo"',
          'Selecciona el tipo de periodo',
          'Define las fechas de inicio, fin y pago',
          'Guarda el periodo',
        ],
      },
      {
        title: 'Calcular Nomina',
        content: 'El calculo de nomina aplica automaticamente las percepciones (sueldo, bonos) y deducciones (ISR, IMSS, INFONAVIT) segun la configuracion del sistema.',
        steps: [
          'Selecciona el periodo a calcular',
          'Revisa la lista de empleados incluidos',
          'Haz clic en "Calcular Nomina"',
          'Revisa los resultados en la vista previa',
          'Si todo es correcto, aprueba la nomina',
        ],
      },
      {
        title: 'Aprobar y Pagar Nomina',
        content: 'Una vez calculada la nomina, debe ser aprobada antes de marcarse como pagada. Esto genera los recibos para cada empleado.',
        steps: [
          'Revisa los totales del periodo',
          'Haz clic en "Aprobar"',
          'Genera la dispersion bancaria si es necesario',
          'Marca el periodo como "Pagado"',
        ],
      },
      {
        title: 'Agregar Incidencias',
        content: 'Las incidencias (faltas, retardos, tiempo extra, bonos) afectan el calculo de la nomina. Deben registrarse antes de calcular.',
        steps: [
          'Ve a Incidencias',
          'Selecciona el periodo y empleado',
          'Agrega la incidencia con su tipo y valor',
          'Guarda la incidencia',
        ],
      },
    ],
  },
  {
    id: 'attendance',
    title: 'Control de Asistencia',
    icon: ClockIcon,
    content: [
      {
        title: 'Registrar Entrada/Salida',
        content: 'Los empleados pueden registrar su asistencia desde el portal de empleado o desde el modulo de asistencia.',
        steps: [
          'El empleado ingresa al sistema',
          'Haz clic en "Registrar Entrada" al llegar',
          'Haz clic en "Registrar Salida" al terminar',
          'El sistema registra la hora automaticamente',
        ],
      },
      {
        title: 'Ver Historial de Asistencia',
        content: 'Puedes consultar el historial de asistencia por empleado o por fecha. El sistema muestra retardos y ausencias.',
      },
      {
        title: 'Corregir Asistencia',
        content: 'Si un empleado olvido registrar su asistencia, un administrador puede corregirlo manualmente.',
      },
    ],
  },
  {
    id: 'vacations',
    title: 'Vacaciones y Permisos',
    icon: CalendarDaysIcon,
    content: [
      {
        title: 'Consultar Dias Disponibles',
        content: 'El sistema calcula automaticamente los dias de vacaciones segun la antiguedad del empleado conforme a la Ley Federal del Trabajo.',
      },
      {
        title: 'Solicitar Vacaciones',
        content: 'Los empleados pueden solicitar vacaciones desde su portal. La solicitud debe ser aprobada por su supervisor o RH.',
        steps: [
          'Ve a Mi Portal > Solicitar Vacaciones',
          'Selecciona las fechas de inicio y fin',
          'Agrega comentarios si es necesario',
          'Envia la solicitud',
        ],
      },
      {
        title: 'Aprobar Solicitudes',
        content: 'Las solicitudes pendientes aparecen en el modulo de Vacaciones. Puedes aprobar o rechazar cada solicitud.',
      },
    ],
  },
  {
    id: 'receipts',
    title: 'Recibos de Nomina',
    icon: DocumentTextIcon,
    content: [
      {
        title: 'Ver Recibos',
        content: 'Los recibos de nomina se generan automaticamente al pagar cada periodo. Puedes verlos en PDF o descargarlos.',
      },
      {
        title: 'Descargar XML (CFDI)',
        content: 'Si la empresa tiene configurado el timbrado, puedes descargar el XML del CFDI de cada recibo.',
      },
      {
        title: 'Historial de Pagos',
        content: 'Puedes consultar el historial completo de pagos de cada empleado, incluyendo percepciones y deducciones.',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reportes',
    icon: ChartBarIcon,
    content: [
      {
        title: 'Reportes de Nomina',
        content: 'Genera reportes detallados de nomina en Excel o PDF. Incluye resumen de percepciones, deducciones y netos.',
        steps: [
          'Ve a Reportes',
          'Selecciona "Nomina en Excel" o "Nomina en PDF"',
          'Elige el periodo',
          'Haz clic en "Generar"',
          'El archivo se descargara automaticamente',
        ],
      },
      {
        title: 'Reporte IMSS',
        content: 'Genera el reporte de cuotas obrero-patronales del IMSS para presentar en el SUA.',
      },
      {
        title: 'Archivo SUA',
        content: 'Genera el archivo de texto para importar en el Sistema Unico de Autodeterminacion del IMSS.',
      },
      {
        title: 'Dispersion Bancaria',
        content: 'Genera el archivo de dispersion bancaria para realizar los pagos masivos a los empleados.',
      },
    ],
  },
  {
    id: 'config',
    title: 'Configuracion',
    icon: Cog6ToothIcon,
    content: [
      {
        title: 'Configuracion de Empresa',
        content: 'Configura los datos de la empresa, logo, colores y certificados de facturacion electronica.',
      },
      {
        title: 'Configuracion Contable',
        content: 'Administra las tablas de ISR, tasas de IMSS, valores del UMA y configuracion de prestaciones.',
      },
      {
        title: 'Departamentos y Puestos',
        content: 'Administra la estructura organizacional de la empresa creando departamentos y puestos.',
      },
      {
        title: 'Usuarios del Sistema',
        content: 'Crea y administra usuarios con diferentes roles: Administrador, RH, Gerente, Empleado.',
      },
    ],
  },
];

const faqItems = [
  {
    question: 'Como cambio mi contrasena?',
    answer: 'Ve a tu perfil haciendo clic en tu nombre en la esquina superior derecha, luego selecciona "Cambiar Contrasena".',
  },
  {
    question: 'Por que mi nomina es diferente al periodo anterior?',
    answer: 'La nomina puede variar por varios motivos: cambios en dias trabajados, incidencias (faltas, retardos, tiempo extra), cambios de salario, o ajustes en las tablas de ISR.',
  },
  {
    question: 'Como solicito vacaciones?',
    answer: 'Ingresa a tu portal de empleado, selecciona la opcion "Solicitar Vacaciones", elige las fechas y envia la solicitud. Tu supervisor recibira una notificacion para aprobarla.',
  },
  {
    question: 'Donde puedo ver mis recibos de nomina?',
    answer: 'En el portal de empleado encontraras todos tus recibos de nomina. Puedes verlos en linea, descargarlos en PDF o descargar el XML si aplica.',
  },
  {
    question: 'Que hago si hay un error en mi recibo?',
    answer: 'Contacta inmediatamente al departamento de Recursos Humanos para reportar el error. Ellos pueden realizar ajustes o correcciones en la siguiente nomina.',
  },
];

export default function HelpPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
    setExpandedTopic(null);
  };

  const toggleTopic = (topicTitle: string) => {
    setExpandedTopic(expandedTopic === topicTitle ? null : topicTitle);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <BookOpenIcon className="h-8 w-8 text-primary-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Manual de Usuario</h1>
        </div>
        <p className="text-gray-500">
          Guia completa para usar el sistema de nomina. Selecciona un tema para ver instrucciones detalladas.
        </p>
      </div>

      {/* Quick Download Section */}
      <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary-900">Descargar Manual Completo</h3>
            <p className="text-sm text-primary-700 mt-1">
              Descarga el manual en PDF para consultarlo sin conexion
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Help Sections */}
      <div className="space-y-4 mb-12">
        {helpSections.map((section) => (
          <div key={section.id} className="card">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center">
                <section.icon className="h-6 w-6 text-primary-600 mr-3" />
                <span className="font-semibold text-gray-900">{section.title}</span>
              </div>
              {expandedSection === section.id ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSection === section.id && (
              <div className="mt-4 space-y-3">
                {section.content.map((topic) => (
                  <div key={topic.title} className="border-l-2 border-primary-200 pl-4">
                    <button
                      onClick={() => toggleTopic(topic.title)}
                      className="w-full flex items-center justify-between text-left py-2"
                    >
                      <span className="font-medium text-gray-700">{topic.title}</span>
                      {expandedTopic === topic.title ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {expandedTopic === topic.title && (
                      <div className="pb-3">
                        <p className="text-gray-600 text-sm mb-3">{topic.content}</p>
                        {topic.steps && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Pasos:</p>
                            <ol className="list-decimal list-inside space-y-1">
                              {topic.steps.map((step, index) => (
                                <li key={index} className="text-sm text-gray-600">{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <QuestionMarkCircleIcon className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">Preguntas Frecuentes</h2>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="card">
              <h3 className="font-medium text-gray-900 mb-2">{item.question}</h3>
              <p className="text-gray-600 text-sm">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Necesitas mas ayuda?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Si no encontraste la respuesta a tu pregunta, contacta al equipo de soporte.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:soporte@nomina.com"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Enviar Correo
          </a>
          <a
            href="tel:+5215512345678"
            className="inline-flex items-center px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Llamar a Soporte
          </a>
        </div>
      </div>
    </div>
  );
}

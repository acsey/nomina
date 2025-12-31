/**
 * Etiquetas y Mensajes para Transparencia Gubernamental
 * Mejora UX para usuarios no técnicos
 */

// Estados de período de nómina con etiquetas descriptivas
export const PAYROLL_PERIOD_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  DRAFT: {
    label: 'Borrador',
    description: 'Período en preparación. Se pueden agregar incidencias.',
    color: 'gray',
  },
  PROCESSING: {
    label: 'En Proceso',
    description: 'Calculando nómina. Por favor espere.',
    color: 'blue',
  },
  CALCULATED: {
    label: 'Calculado - Pendiente de Autorización',
    description: 'Cálculo completado. Requiere autorización para timbrado.',
    color: 'yellow',
  },
  APPROVED: {
    label: 'Autorizado para Timbrado',
    description: 'Período aprobado. Listo para timbrar recibos.',
    color: 'green',
  },
  PAID: {
    label: 'Pagado',
    description: 'Nómina procesada y pagada.',
    color: 'emerald',
  },
  CLOSED: {
    label: 'Cerrado',
    description: 'Período cerrado. No se permiten cambios.',
    color: 'slate',
  },
  CANCELLED: {
    label: 'Cancelado',
    description: 'Período cancelado.',
    color: 'red',
  },
};

// Estados de recibo individual
export const PAYROLL_DETAIL_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  PENDING: {
    label: 'Pendiente',
    description: 'Recibo pendiente de cálculo.',
    color: 'gray',
  },
  CALCULATED: {
    label: 'Calculado',
    description: 'Recibo calculado, pendiente de aprobación.',
    color: 'yellow',
  },
  APPROVED: {
    label: 'Aprobado',
    description: 'Recibo aprobado para pago.',
    color: 'green',
  },
  PAID: {
    label: 'Pagado',
    description: 'Recibo pagado al empleado.',
    color: 'emerald',
  },
  CANCELLED: {
    label: 'Cancelado',
    description: 'Recibo cancelado.',
    color: 'red',
  },
};

// Estados de CFDI
export const CFDI_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  PENDING: {
    label: 'Pendiente de Timbrado',
    description: 'CFDI generado, esperando envío al PAC.',
    color: 'yellow',
  },
  STAMPED: {
    label: 'Timbrado',
    description: 'CFDI timbrado correctamente por el SAT.',
    color: 'green',
  },
  CANCELLED: {
    label: 'Cancelado',
    description: 'CFDI cancelado ante el SAT.',
    color: 'red',
  },
  ERROR: {
    label: 'Error en Timbrado',
    description: 'Error al timbrar. Ver detalles para más información.',
    color: 'red',
  },
};

// Errores comunes de timbrado con explicaciones
export const STAMPING_ERROR_EXPLANATIONS: Record<string, { title: string; explanation: string; action: string }> = {
  'CERTIFICATE_EXPIRED': {
    title: 'Certificado Vencido',
    explanation: 'El Certificado de Sello Digital (CSD) ha expirado.',
    action: 'Contacte al administrador para renovar el certificado ante el SAT.',
  },
  'INVALID_RFC': {
    title: 'RFC Inválido',
    explanation: 'El RFC del empleado no es válido según el SAT.',
    action: 'Verifique y corrija el RFC del empleado en su expediente.',
  },
  'INVALID_SEAL': {
    title: 'Sello Digital Inválido',
    explanation: 'El sello digital del comprobante no es válido.',
    action: 'Verifique que el certificado configurado sea el correcto.',
  },
  'PAC_UNAVAILABLE': {
    title: 'Servicio de Timbrado No Disponible',
    explanation: 'El proveedor de timbrado (PAC) no está disponible temporalmente.',
    action: 'El sistema reintentará automáticamente. Si persiste, contacte soporte.',
  },
  'NETWORK_ERROR': {
    title: 'Error de Conexión',
    explanation: 'No se pudo establecer conexión con el servicio de timbrado.',
    action: 'Verifique la conexión a internet y reintente.',
  },
  'VALIDATION_ERROR': {
    title: 'Error de Validación Fiscal',
    explanation: 'El comprobante no cumple con las reglas de validación del SAT.',
    action: 'Revise los datos del recibo y corrija según los detalles del error.',
  },
  'DUPLICATE_UUID': {
    title: 'Comprobante Duplicado',
    explanation: 'Este recibo ya fue timbrado anteriormente.',
    action: 'Busque el UUID existente en el historial del empleado.',
  },
  'INSUFFICIENT_CREDITS': {
    title: 'Sin Créditos de Timbrado',
    explanation: 'No hay créditos disponibles con el PAC para timbrar.',
    action: 'Contacte al administrador para adquirir más créditos.',
  },
};

// Estados de integridad
export const INTEGRITY_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  PENDING: {
    label: 'Pendiente de Verificación',
    description: 'El snapshot no ha sido verificado.',
    color: 'gray',
  },
  VERIFIED: {
    label: 'Verificado',
    description: 'La integridad del snapshot ha sido verificada.',
    color: 'green',
  },
  CORRUPTED: {
    label: '⚠️ Integridad Comprometida',
    description: 'Se detectó una posible alteración de datos. Contacte al administrador.',
    color: 'red',
  },
};

// Severidad de alertas
export const ALERT_SEVERITY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  CRITICAL: {
    label: 'Crítica',
    color: 'red',
    icon: '🚨',
  },
  HIGH: {
    label: 'Alta',
    color: 'orange',
    icon: '⚠️',
  },
  MEDIUM: {
    label: 'Media',
    color: 'yellow',
    icon: '⚡',
  },
  LOW: {
    label: 'Baja',
    color: 'blue',
    icon: 'ℹ️',
  },
};

// Acciones que requieren justificación
export const CRITICAL_ACTIONS: Record<string, { name: string; requiresJustification: boolean; requiresDualControl: boolean }> = {
  RECALCULATE: {
    name: 'Recalcular Nómina',
    requiresJustification: true,
    requiresDualControl: true,
  },
  AUTHORIZE_STAMPING: {
    name: 'Autorizar Timbrado',
    requiresJustification: true,
    requiresDualControl: false,
  },
  CANCEL_CFDI: {
    name: 'Cancelar CFDI',
    requiresJustification: true,
    requiresDualControl: true,
  },
  RETRY_STAMPING: {
    name: 'Reintentar Timbrado',
    requiresJustification: true,
    requiresDualControl: false,
  },
  REVOKE_AUTHORIZATION: {
    name: 'Revocar Autorización',
    requiresJustification: true,
    requiresDualControl: true,
  },
  CLOSE_PERIOD: {
    name: 'Cerrar Período',
    requiresJustification: true,
    requiresDualControl: false,
  },
};

// Tipos de período
export const PERIOD_TYPE_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  EXTRAORDINARY: 'Extraordinario',
};

// Tipos de período extraordinario
export const EXTRAORDINARY_TYPE_LABELS: Record<string, string> = {
  AGUINALDO: 'Aguinaldo',
  VACATION_PREMIUM: 'Prima Vacacional',
  PTU: 'Reparto de Utilidades (PTU)',
  SETTLEMENT: 'Finiquito',
  LIQUIDATION: 'Liquidación',
  BONUS: 'Bono Extraordinario',
  RETROACTIVE: 'Pago Retroactivo',
  OTHER: 'Otro',
};

// Formateadores de moneda
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num);
}

// Formateador de fechas
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

// Formateador de fecha y hora
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Helper para obtener etiqueta de estado
export function getStatusLabel(
  type: 'period' | 'detail' | 'cfdi' | 'integrity',
  status: string,
): { label: string; description: string; color: string } {
  const maps = {
    period: PAYROLL_PERIOD_STATUS_LABELS,
    detail: PAYROLL_DETAIL_STATUS_LABELS,
    cfdi: CFDI_STATUS_LABELS,
    integrity: INTEGRITY_STATUS_LABELS,
  };

  return maps[type][status] || { label: status, description: '', color: 'gray' };
}

// Helper para explicar error de timbrado
export function getStampingErrorExplanation(errorCode: string): { title: string; explanation: string; action: string } {
  // Buscar coincidencia exacta o parcial
  const key = Object.keys(STAMPING_ERROR_EXPLANATIONS).find(
    (k) => errorCode.includes(k) || k.includes(errorCode.split(':')[0]),
  );

  return key
    ? STAMPING_ERROR_EXPLANATIONS[key]
    : {
        title: 'Error de Timbrado',
        explanation: errorCode,
        action: 'Contacte al administrador del sistema.',
      };
}

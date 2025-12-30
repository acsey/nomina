/**
 * Constantes de colas
 * Archivo separado para evitar dependencias circulares
 */

// Nombres de las colas
export const QUEUE_NAMES = {
  CFDI_STAMPING: 'cfdi-stamping',
  CFDI_CANCELLATION: 'cfdi-cancellation',
  PAYROLL_CALCULATION: 'payroll-calculation',
  REPORTS_GENERATION: 'reports-generation',
  NOTIFICATIONS: 'notifications',
  IMSS_SYNC: 'imss-sync',
} as const;

// Configuración de reintentos por tipo de trabajo
export const RETRY_CONFIG = {
  // Timbrado CFDI - crítico, más reintentos
  [QUEUE_NAMES.CFDI_STAMPING]: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 2000, // 2s, 4s, 8s, 16s, 32s
    },
  },
  // Cancelación CFDI
  [QUEUE_NAMES.CFDI_CANCELLATION]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  },
  // Cálculo de nómina - puede tardar
  [QUEUE_NAMES.PAYROLL_CALCULATION]: {
    attempts: 3,
    backoff: {
      type: 'fixed' as const,
      delay: 10000,
    },
  },
  // Generación de reportes
  [QUEUE_NAMES.REPORTS_GENERATION]: {
    attempts: 2,
    backoff: {
      type: 'fixed' as const,
      delay: 5000,
    },
  },
  // Notificaciones - menos crítico
  [QUEUE_NAMES.NOTIFICATIONS]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },
  // Sincronización IMSS
  [QUEUE_NAMES.IMSS_SYNC]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 30000,
    },
  },
};

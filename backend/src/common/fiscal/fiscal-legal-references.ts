/**
 * Referencias Legales para Cálculos Fiscales
 * Cumplimiento: Gobierno MX - Trazabilidad con fundamento legal
 *
 * Cada cálculo fiscal debe poder explicarse con:
 * - Ley aplicable
 * - Artículo específico
 * - Fuente normativa (DOF)
 * - Fecha de publicación
 */

export interface LegalReference {
  law: string;
  article: string;
  source: string;
  publishedAt: string; // YYYY-MM-DD
  notes?: string;
}

/**
 * Referencias legales para ISR (Impuesto Sobre la Renta)
 */
export const ISR_LEGAL_REFERENCES: Record<string, LegalReference> = {
  // ISR sobre salarios
  ISR_SALARY: {
    law: 'LISR',
    article: 'Art. 96',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'Retención de ISR sobre salarios y asimilados',
  },

  // Tabla mensual de ISR
  ISR_TABLE_MONTHLY: {
    law: 'LISR',
    article: 'Art. 96, Anexo 8 RMF',
    source: 'DOF',
    publishedAt: '2024-12-29',
    notes: 'Tarifas para cálculo del impuesto mensual',
  },

  // Tabla semanal/quincenal de ISR
  ISR_TABLE_PERIODIC: {
    law: 'LISR',
    article: 'Art. 96, Anexo 8 RMF',
    source: 'DOF',
    publishedAt: '2024-12-29',
    notes: 'Tarifas para períodos distintos al mensual',
  },

  // Subsidio al empleo
  SUBSIDIO_EMPLEO: {
    law: 'LISR',
    article: 'Art. Décimo Transitorio 2013',
    source: 'DOF',
    publishedAt: '2013-12-11',
    notes: 'Subsidio para el empleo vigente',
  },

  // ISR sobre aguinaldo
  ISR_AGUINALDO: {
    law: 'LISR',
    article: 'Art. 96',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'Retención sobre gratificación anual',
  },

  // Exención aguinaldo
  AGUINALDO_EXENTO: {
    law: 'LISR',
    article: 'Art. 93 Fracción XIV',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'Exención hasta 30 días de UMA',
  },

  // PTU
  ISR_PTU: {
    law: 'LISR',
    article: 'Art. 96 y 93 Fracción XIV',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'Participación de trabajadores en utilidades',
  },

  // Prima vacacional
  ISR_PRIMA_VACACIONAL: {
    law: 'LISR',
    article: 'Art. 93 Fracción XIV',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'Exención hasta 15 días de UMA',
  },

  // Horas extra exentas
  HORAS_EXTRA_EXENTAS: {
    law: 'LISR',
    article: 'Art. 93 Fracción I',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: '50% exento hasta el equivalente de 5 UMA por semana',
  },

  // Finiquito/Liquidación
  ISR_LIQUIDACION: {
    law: 'LISR',
    article: 'Art. 95 y 96',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'ISR sobre indemnizaciones y primas de antigüedad',
  },

  // Indemnización exenta
  INDEMNIZACION_EXENTA: {
    law: 'LISR',
    article: 'Art. 93 Fracción XIII',
    source: 'DOF',
    publishedAt: '2024-12-27',
    notes: 'Exención hasta 90 días de SMG por año de servicio',
  },
};

/**
 * Referencias legales para IMSS
 */
export const IMSS_LEGAL_REFERENCES: Record<string, LegalReference> = {
  // Cuotas obrero-patronales
  IMSS_CUOTAS: {
    law: 'LSS',
    article: 'Arts. 25, 106-110, 147, 168, 211',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Régimen obligatorio de seguro social',
  },

  // Enfermedad y maternidad - prestaciones en especie cuota fija
  IMSS_EYM_ESPECIE_FIJA: {
    law: 'LSS',
    article: 'Art. 106 Fracción I',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Cuota fija patronal: 20.40% del SMG',
  },

  // Enfermedad y maternidad - prestaciones en especie excedente
  IMSS_EYM_ESPECIE_EXCEDENTE: {
    law: 'LSS',
    article: 'Art. 106 Fracción II',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Excedente de 3 SMGDF: Patrón 1.10%, Trabajador 0.40%',
  },

  // Enfermedad y maternidad - prestaciones en dinero
  IMSS_EYM_DINERO: {
    law: 'LSS',
    article: 'Art. 107',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Patrón 0.70%, Trabajador 0.25%',
  },

  // Invalidez y vida
  IMSS_IV: {
    law: 'LSS',
    article: 'Art. 147',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Patrón 1.75%, Trabajador 0.625%',
  },

  // Riesgo de trabajo
  IMSS_RT: {
    law: 'LSS',
    article: 'Arts. 71, 72, 73',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Prima de riesgo según clasificación',
  },

  // Retiro
  IMSS_RETIRO: {
    law: 'LSS',
    article: 'Art. 168 Fracción I',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Aportación patronal 2%',
  },

  // Cesantía en edad avanzada y vejez
  IMSS_CEAV: {
    law: 'LSS',
    article: 'Art. 168 Fracción II',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Patrón varía según reforma, Trabajador 1.125%',
  },

  // Guarderías
  IMSS_GUARDERIAS: {
    law: 'LSS',
    article: 'Art. 211',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Cuota patronal 1%',
  },

  // INFONAVIT
  INFONAVIT: {
    law: 'LINFONAVIT',
    article: 'Art. 29 Fracción II',
    source: 'DOF',
    publishedAt: '2024-01-10',
    notes: 'Aportación patronal 5%',
  },

  // Límite SBC
  SBC_LIMITE: {
    law: 'LSS',
    article: 'Art. 28',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Tope de 25 UMA',
  },

  // Salario mínimo de cotización
  SBC_MINIMO: {
    law: 'LSS',
    article: 'Art. 28',
    source: 'DOF',
    publishedAt: '2024-05-16',
    notes: 'Mínimo el SMG vigente',
  },
};

/**
 * Referencias legales para ISN (Impuesto Sobre Nóminas)
 */
export const ISN_LEGAL_REFERENCES: Record<string, LegalReference> = {
  // ISN por defecto (varía por estado)
  ISN_DEFAULT: {
    law: 'Código Fiscal Estatal',
    article: 'Variable por estado',
    source: 'Periódico Oficial Estatal',
    publishedAt: '2024-01-01',
    notes: 'El artículo y tasa varían según el estado',
  },

  // Estados con tasas conocidas
  ISN_CDMX: {
    law: 'Código Fiscal CDMX',
    article: 'Art. 156',
    source: 'Gaceta Oficial CDMX',
    publishedAt: '2024-12-27',
    notes: 'Tasa 3%',
  },

  ISN_EDOMEX: {
    law: 'Código Financiero EdoMex',
    article: 'Art. 56',
    source: 'Gaceta del Gobierno',
    publishedAt: '2024-12-27',
    notes: 'Tasa 3%',
  },

  ISN_JAL: {
    law: 'Ley de Hacienda de Jalisco',
    article: 'Art. 46',
    source: 'Periódico Oficial',
    publishedAt: '2024-12-27',
    notes: 'Tasa 2.5%',
  },

  ISN_NL: {
    law: 'Ley de Hacienda de NL',
    article: 'Art. 154',
    source: 'Periódico Oficial',
    publishedAt: '2024-12-27',
    notes: 'Tasa 3%',
  },
};

/**
 * Referencias legales para prestaciones laborales
 */
export const LABOR_LEGAL_REFERENCES: Record<string, LegalReference> = {
  // Aguinaldo
  AGUINALDO: {
    law: 'LFT',
    article: 'Art. 87',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: 'Mínimo 15 días de salario',
  },

  // Vacaciones
  VACACIONES: {
    law: 'LFT',
    article: 'Art. 76',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: 'Días de vacaciones según antigüedad (reforma 2023)',
  },

  // Prima vacacional
  PRIMA_VACACIONAL: {
    law: 'LFT',
    article: 'Art. 80',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: 'Mínimo 25% sobre salario de vacaciones',
  },

  // PTU
  PTU: {
    law: 'LFT',
    article: 'Arts. 117-131',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: '10% de utilidades, límite 3 meses de salario',
  },

  // Finiquito
  FINIQUITO: {
    law: 'LFT',
    article: 'Arts. 47, 48, 50',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: 'Prestaciones proporcionales por renuncia voluntaria',
  },

  // Liquidación
  LIQUIDACION: {
    law: 'LFT',
    article: 'Arts. 48, 50, 162',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: '3 meses + 20 días por año + prima antigüedad',
  },

  // Prima de antigüedad
  PRIMA_ANTIGUEDAD: {
    law: 'LFT',
    article: 'Art. 162',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: '12 días por año de servicio, tope 2 SMG',
  },

  // Horas extra
  HORAS_EXTRA: {
    law: 'LFT',
    article: 'Arts. 66, 67, 68',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: 'Dobles primeras 9 horas semana, triples excedentes',
  },

  // Día de descanso trabajado
  DESCANSO_TRABAJADO: {
    law: 'LFT',
    article: 'Art. 73',
    source: 'DOF',
    publishedAt: '2024-06-13',
    notes: 'Pago triple',
  },
};

/**
 * Obtiene la referencia legal para un tipo de cálculo
 */
export function getLegalReference(
  conceptType: string,
  conceptCode: string,
): LegalReference | null {
  // ISR
  if (conceptType === 'ISR') {
    if (conceptCode.includes('AGUINALDO')) return ISR_LEGAL_REFERENCES.ISR_AGUINALDO;
    if (conceptCode.includes('PTU')) return ISR_LEGAL_REFERENCES.ISR_PTU;
    if (conceptCode.includes('PRIMA_VACACIONAL')) return ISR_LEGAL_REFERENCES.ISR_PRIMA_VACACIONAL;
    if (conceptCode.includes('LIQUIDACION')) return ISR_LEGAL_REFERENCES.ISR_LIQUIDACION;
    return ISR_LEGAL_REFERENCES.ISR_SALARY;
  }

  // Subsidio
  if (conceptType === 'SUBSIDIO') {
    return ISR_LEGAL_REFERENCES.SUBSIDIO_EMPLEO;
  }

  // IMSS Empleado
  if (conceptType === 'IMSS_EMPLOYEE') {
    if (conceptCode.includes('EYM')) return IMSS_LEGAL_REFERENCES.IMSS_EYM_ESPECIE_EXCEDENTE;
    if (conceptCode.includes('IV')) return IMSS_LEGAL_REFERENCES.IMSS_IV;
    if (conceptCode.includes('CEAV')) return IMSS_LEGAL_REFERENCES.IMSS_CEAV;
    return IMSS_LEGAL_REFERENCES.IMSS_CUOTAS;
  }

  // IMSS Patronal
  if (conceptType === 'IMSS_EMPLOYER') {
    if (conceptCode.includes('EYM_FIJA')) return IMSS_LEGAL_REFERENCES.IMSS_EYM_ESPECIE_FIJA;
    if (conceptCode.includes('EYM_EXCEDENTE')) return IMSS_LEGAL_REFERENCES.IMSS_EYM_ESPECIE_EXCEDENTE;
    if (conceptCode.includes('EYM_DINERO')) return IMSS_LEGAL_REFERENCES.IMSS_EYM_DINERO;
    if (conceptCode.includes('IV')) return IMSS_LEGAL_REFERENCES.IMSS_IV;
    if (conceptCode.includes('RT')) return IMSS_LEGAL_REFERENCES.IMSS_RT;
    if (conceptCode.includes('RETIRO')) return IMSS_LEGAL_REFERENCES.IMSS_RETIRO;
    if (conceptCode.includes('CEAV')) return IMSS_LEGAL_REFERENCES.IMSS_CEAV;
    if (conceptCode.includes('GUARDERIA')) return IMSS_LEGAL_REFERENCES.IMSS_GUARDERIAS;
    if (conceptCode.includes('INFONAVIT')) return IMSS_LEGAL_REFERENCES.INFONAVIT;
    return IMSS_LEGAL_REFERENCES.IMSS_CUOTAS;
  }

  // ISN
  if (conceptType === 'ISN') {
    return ISN_LEGAL_REFERENCES.ISN_DEFAULT;
  }

  return null;
}

/**
 * Obtiene referencia legal por estado para ISN
 */
export function getIsnLegalReference(stateCode: string): LegalReference {
  const stateKey = `ISN_${stateCode.toUpperCase()}`;
  return ISN_LEGAL_REFERENCES[stateKey] || ISN_LEGAL_REFERENCES.ISN_DEFAULT;
}

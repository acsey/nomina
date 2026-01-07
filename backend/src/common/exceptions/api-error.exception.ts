import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * API Error Response structure
 * Returns: { code, message, i18nKey, details? }
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  i18nKey: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}

/**
 * Standard API Exception with i18n support
 */
export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    public readonly i18nKey: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        code,
        message,
        i18nKey,
        details,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

// Common error codes and their i18n keys
export const ErrorCodes = {
  // Validation errors
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', i18nKey: 'errors.validation' },
  REQUIRED_FIELD: { code: 'REQUIRED_FIELD', i18nKey: 'errors.validation.required' },
  INVALID_FORMAT: { code: 'INVALID_FORMAT', i18nKey: 'errors.validation.invalidFormat' },

  // Authentication errors
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', i18nKey: 'errors.auth.invalidCredentials' },
  SESSION_EXPIRED: { code: 'SESSION_EXPIRED', i18nKey: 'errors.auth.tokenExpired' },
  MFA_REQUIRED: { code: 'MFA_REQUIRED', i18nKey: 'errors.auth.mfaRequired' },
  MFA_INVALID: { code: 'MFA_INVALID', i18nKey: 'errors.auth.mfaInvalid' },
  ACCOUNT_LOCKED: { code: 'ACCOUNT_LOCKED', i18nKey: 'errors.auth.accountLocked' },
  ACCOUNT_DISABLED: { code: 'ACCOUNT_DISABLED', i18nKey: 'errors.auth.accountDisabled' },
  SSO_REQUIRED: { code: 'SSO_REQUIRED', i18nKey: 'errors.auth.ssoRequired' },

  // Authorization errors
  FORBIDDEN: { code: 'FORBIDDEN', i18nKey: 'errors.forbidden' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', i18nKey: 'errors.unauthorized' },

  // Resource errors
  NOT_FOUND: { code: 'NOT_FOUND', i18nKey: 'errors.notFound' },
  CONFLICT: { code: 'CONFLICT', i18nKey: 'errors.conflict' },

  // Employee errors
  EMPLOYEE_NOT_FOUND: { code: 'EMPLOYEE_NOT_FOUND', i18nKey: 'errors.employee.notFound' },
  DUPLICATE_EMAIL: { code: 'DUPLICATE_EMAIL', i18nKey: 'errors.employee.duplicateEmail' },
  DUPLICATE_RFC: { code: 'DUPLICATE_RFC', i18nKey: 'errors.employee.duplicateRfc' },
  DUPLICATE_CURP: { code: 'DUPLICATE_CURP', i18nKey: 'errors.employee.duplicateCurp' },
  DUPLICATE_NSS: { code: 'DUPLICATE_NSS', i18nKey: 'errors.employee.duplicateNss' },
  INVALID_RFC: { code: 'INVALID_RFC', i18nKey: 'errors.employee.invalidRfc' },
  INVALID_CURP: { code: 'INVALID_CURP', i18nKey: 'errors.employee.invalidCurp' },

  // Payroll errors
  PERIOD_NOT_FOUND: { code: 'PERIOD_NOT_FOUND', i18nKey: 'errors.payroll.periodNotFound' },
  PERIOD_CLOSED: { code: 'PERIOD_CLOSED', i18nKey: 'errors.payroll.periodClosed' },
  PERIOD_LOCKED: { code: 'PERIOD_LOCKED', i18nKey: 'errors.payroll.periodLocked' },
  CALCULATION_ERROR: { code: 'CALCULATION_ERROR', i18nKey: 'errors.payroll.calculationError' },
  STAMPING_ERROR: { code: 'STAMPING_ERROR', i18nKey: 'errors.payroll.stampingError' },

  // Vacation errors
  INSUFFICIENT_DAYS: { code: 'INSUFFICIENT_DAYS', i18nKey: 'errors.vacation.insufficientDays' },
  OVERLAPPING_REQUEST: { code: 'OVERLAPPING_REQUEST', i18nKey: 'errors.vacation.overlappingRequest' },
  INVALID_DATES: { code: 'INVALID_DATES', i18nKey: 'errors.vacation.invalidDates' },
  REQUEST_NOT_FOUND: { code: 'REQUEST_NOT_FOUND', i18nKey: 'errors.vacation.requestNotFound' },

  // Server errors
  SERVER_ERROR: { code: 'SERVER_ERROR', i18nKey: 'errors.serverError' },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', i18nKey: 'errors.serverError' },
  EXTERNAL_SERVICE_ERROR: { code: 'EXTERNAL_SERVICE_ERROR', i18nKey: 'errors.serverUnavailable' },
} as const;

// Helper functions to create common exceptions
export const createApiError = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new ApiException(
      ErrorCodes.VALIDATION_ERROR.code,
      ErrorCodes.VALIDATION_ERROR.i18nKey,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    ),

  notFound: (resource: string) =>
    new ApiException(
      ErrorCodes.NOT_FOUND.code,
      ErrorCodes.NOT_FOUND.i18nKey,
      `${resource} not found`,
      HttpStatus.NOT_FOUND,
      { resource },
    ),

  unauthorized: (message = 'Unauthorized') =>
    new ApiException(
      ErrorCodes.UNAUTHORIZED.code,
      ErrorCodes.UNAUTHORIZED.i18nKey,
      message,
      HttpStatus.UNAUTHORIZED,
    ),

  forbidden: (message = 'Forbidden') =>
    new ApiException(
      ErrorCodes.FORBIDDEN.code,
      ErrorCodes.FORBIDDEN.i18nKey,
      message,
      HttpStatus.FORBIDDEN,
    ),

  conflict: (message: string, details?: Record<string, unknown>) =>
    new ApiException(
      ErrorCodes.CONFLICT.code,
      ErrorCodes.CONFLICT.i18nKey,
      message,
      HttpStatus.CONFLICT,
      details,
    ),

  invalidCredentials: () =>
    new ApiException(
      ErrorCodes.INVALID_CREDENTIALS.code,
      ErrorCodes.INVALID_CREDENTIALS.i18nKey,
      'Invalid credentials',
      HttpStatus.UNAUTHORIZED,
    ),

  mfaRequired: () =>
    new ApiException(
      ErrorCodes.MFA_REQUIRED.code,
      ErrorCodes.MFA_REQUIRED.i18nKey,
      'MFA code required',
      HttpStatus.UNAUTHORIZED,
    ),

  employeeNotFound: (id: string) =>
    new ApiException(
      ErrorCodes.EMPLOYEE_NOT_FOUND.code,
      ErrorCodes.EMPLOYEE_NOT_FOUND.i18nKey,
      `Employee with ID ${id} not found`,
      HttpStatus.NOT_FOUND,
      { employeeId: id },
    ),

  duplicateEmployee: (field: 'email' | 'rfc' | 'curp' | 'nss', value: string) => {
    const codeMap = {
      email: ErrorCodes.DUPLICATE_EMAIL,
      rfc: ErrorCodes.DUPLICATE_RFC,
      curp: ErrorCodes.DUPLICATE_CURP,
      nss: ErrorCodes.DUPLICATE_NSS,
    };
    return new ApiException(
      codeMap[field].code,
      codeMap[field].i18nKey,
      `Employee with ${field} ${value} already exists`,
      HttpStatus.CONFLICT,
      { field, value },
    );
  },

  insufficientVacationDays: (requested: number, available: number) =>
    new ApiException(
      ErrorCodes.INSUFFICIENT_DAYS.code,
      ErrorCodes.INSUFFICIENT_DAYS.i18nKey,
      'Insufficient vacation days',
      HttpStatus.BAD_REQUEST,
      { requested, available },
    ),

  serverError: (message = 'Internal server error') =>
    new ApiException(
      ErrorCodes.SERVER_ERROR.code,
      ErrorCodes.SERVER_ERROR.i18nKey,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

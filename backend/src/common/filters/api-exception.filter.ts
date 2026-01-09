import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException, ApiErrorResponse, ErrorCodes } from '../exceptions/api-error.exception';

/**
 * Global exception filter that formats all errors consistently
 * Returns: { code, message, i18nKey, details?, timestamp, path }
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: ApiErrorResponse;
    let status: HttpStatus;

    if (exception instanceof ApiException) {
      // Our custom API exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as ApiErrorResponse;
      errorResponse = {
        ...exceptionResponse,
        path: request.url,
      };
    } else if (exception instanceof HttpException) {
      // Standard NestJS HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;

        // Handle validation errors from class-validator
        if (resp.message && Array.isArray(resp.message)) {
          const fields = this.parseValidationErrors(resp.message);
          errorResponse = {
            code: ErrorCodes.VALIDATION_ERROR.code,
            message: 'Validation failed',
            i18nKey: ErrorCodes.VALIDATION_ERROR.i18nKey,
            details: {
              fields, // New structure: [{ field, i18nKey, message }]
              errors: resp.message, // Deprecated: kept for backwards compatibility
            },
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        } else {
          errorResponse = {
            code: this.getErrorCode(status),
            message: (resp.message as string) || exception.message,
            i18nKey: this.getI18nKey(status),
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }
      } else {
        errorResponse = {
          code: this.getErrorCode(status),
          message: exception.message,
          i18nKey: this.getI18nKey(status),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else {
      // Unknown exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error('Unhandled exception:', exception);

      errorResponse = {
        code: ErrorCodes.SERVER_ERROR.code,
        message: 'An unexpected error occurred',
        i18nKey: ErrorCodes.SERVER_ERROR.i18nKey,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    // Log errors
    if (status >= 500) {
      this.logger.error(`[${status}] ${request.method} ${request.url}`, {
        error: errorResponse,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else if (status >= 400) {
      this.logger.warn(`[${status}] ${request.method} ${request.url}`, errorResponse);
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: HttpStatus): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: ErrorCodes.UNAUTHORIZED.code,
      [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN.code,
      [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND.code,
      [HttpStatus.CONFLICT]: ErrorCodes.CONFLICT.code,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCodes.VALIDATION_ERROR.code,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCodes.SERVER_ERROR.code,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCodes.EXTERNAL_SERVICE_ERROR.code,
    };
    return codeMap[status] || 'ERROR';
  }

  private getI18nKey(status: HttpStatus): string {
    const keyMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'errors.badRequest',
      [HttpStatus.UNAUTHORIZED]: ErrorCodes.UNAUTHORIZED.i18nKey,
      [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN.i18nKey,
      [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND.i18nKey,
      [HttpStatus.CONFLICT]: ErrorCodes.CONFLICT.i18nKey,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCodes.VALIDATION_ERROR.i18nKey,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCodes.SERVER_ERROR.i18nKey,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCodes.EXTERNAL_SERVICE_ERROR.i18nKey,
    };
    return keyMap[status] || 'errors.generic';
  }

  /**
   * Parse class-validator messages into structured field errors
   * Input: ["birthDate must be a valid date", "email should not be empty"]
   * Output: [{ field: "birthDate", i18nKey: "errors.employee.birthDate.invalid", message: "..." }]
   */
  private parseValidationErrors(messages: string[]): Array<{ field: string; i18nKey: string; message: string }> {
    return messages.map((message) => {
      // Extract field name from message (first word before "must", "should", "is", etc.)
      const fieldMatch = message.match(/^(\w+)\s+(must|should|is|has|cannot|needs)/i);
      const field = fieldMatch ? fieldMatch[1] : 'unknown';

      // Generate i18n key based on field and validation type
      const i18nKey = this.generateValidationI18nKey(field, message);

      return {
        field,
        i18nKey,
        message,
      };
    });
  }

  /**
   * Generate i18n key for validation errors
   * Maps common validation patterns to i18n keys
   */
  private generateValidationI18nKey(field: string, message: string): string {
    const lowerMessage = message.toLowerCase();

    // Common validation patterns
    if (lowerMessage.includes('should not be empty') || lowerMessage.includes('is required')) {
      return `errors.validation.${field}.required`;
    }
    if (lowerMessage.includes('must be a valid date') || lowerMessage.includes('invalid date')) {
      return `errors.validation.${field}.invalidDate`;
    }
    if (lowerMessage.includes('must be an email') || lowerMessage.includes('invalid email')) {
      return `errors.validation.${field}.invalidEmail`;
    }
    if (lowerMessage.includes('must be a number') || lowerMessage.includes('must be numeric')) {
      return `errors.validation.${field}.invalidNumber`;
    }
    if (lowerMessage.includes('must be longer than') || lowerMessage.includes('too short')) {
      return `errors.validation.${field}.tooShort`;
    }
    if (lowerMessage.includes('must be shorter than') || lowerMessage.includes('too long')) {
      return `errors.validation.${field}.tooLong`;
    }
    if (lowerMessage.includes('must match')) {
      return `errors.validation.${field}.invalidFormat`;
    }

    // Default: generic field error
    return `errors.validation.${field}.invalid`;
  }
}

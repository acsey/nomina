/**
 * Middleware de Correlation ID
 * Cumplimiento: P0.5 - Observabilidad
 *
 * Genera o propaga un correlationId único para cada request
 * permitiendo rastrear operaciones a través de logs y servicios.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

// Almacenamiento local para el correlationId del request actual
export class RequestContext {
  private static correlationId: string;

  static setCorrelationId(id: string) {
    this.correlationId = id;
  }

  static getCorrelationId(): string {
    return this.correlationId || 'no-correlation-id';
  }
}

// Extender Request para incluir correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // Obtener o generar correlationId
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      `req-${randomUUID()}`;

    // Adjuntar al request
    req.correlationId = correlationId;
    RequestContext.setCorrelationId(correlationId);

    // Agregar al response header para debugging
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Log del request entrante
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';

    // Log estructurado de entrada
    this.logger.log({
      message: 'Incoming request',
      correlationId,
      method,
      path: originalUrl,
      ip,
      userAgent,
    });

    // Interceptar respuesta para log de salida
    const originalSend = res.send;
    res.send = function (body) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log estructurado de salida
      Logger.log({
        message: 'Request completed',
        correlationId,
        method,
        path: originalUrl,
        statusCode,
        responseTime: `${responseTime}ms`,
      }, 'HTTP');

      return originalSend.call(this, body);
    };

    next();
  }
}

/**
 * Helper para obtener correlationId en cualquier parte del código
 */
export function getCorrelationId(): string {
  return RequestContext.getCorrelationId();
}

/**
 * Logger estructurado que incluye correlationId
 */
export class StructuredLogger extends Logger {
  private logContext?: string;

  constructor(context?: string) {
    super(context || 'StructuredLogger');
    this.logContext = context;
  }

  log(message: any, context?: string) {
    const correlationId = getCorrelationId();
    const logEntry = typeof message === 'object'
      ? { ...message, correlationId, context: context || this.logContext }
      : { message, correlationId, context: context || this.logContext };

    super.log(JSON.stringify(logEntry), context);
  }

  error(message: any, trace?: string, context?: string) {
    const correlationId = getCorrelationId();
    const logEntry = {
      message: typeof message === 'object' ? message : { error: message },
      correlationId,
      context: context || this.logContext,
      trace,
      level: 'error',
    };

    super.error(JSON.stringify(logEntry), trace, context);
  }

  warn(message: any, context?: string) {
    const correlationId = getCorrelationId();
    const logEntry = {
      message: typeof message === 'object' ? message : { warning: message },
      correlationId,
      context: context || this.logContext,
      level: 'warn',
    };

    super.warn(JSON.stringify(logEntry), context);
  }

  debug(message: any, context?: string) {
    const correlationId = getCorrelationId();
    const logEntry = {
      message: typeof message === 'object' ? message : { debug: message },
      correlationId,
      context: context || this.logContext,
      level: 'debug',
    };

    super.debug(JSON.stringify(logEntry), context);
  }
}

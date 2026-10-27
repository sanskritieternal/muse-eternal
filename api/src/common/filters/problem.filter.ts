import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  BadRequestError,
  ConflictError,
  DatabaseUnavailableError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors';

/** RFC 9457 titles by status (Phase 3 fixes the Phase 2 wart where
 * every HttpException rendered as 'Bad Request'). */
const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  423: 'Locked',
  503: 'Service Unavailable',
};

/**
 * Global filter: every error leaves the API as an RFC 9457 problem
 * body ({ type, title, status, detail, instance }). No internals leak:
 * unexpected errors collapse to a generic 500 detail. Validation
 * errors additionally carry `details[]` (all field errors at once).
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let detail = 'An unexpected error occurred.';
    let details: string[] | undefined;

    if (exception instanceof DatabaseUnavailableError) {
      status = 503;
      detail = exception.message;
    } else if (exception instanceof NotFoundError) {
      status = 404;
      detail = exception.message;
    } else if (exception instanceof BadRequestError) {
      status = 400;
      detail = exception.message;
    } else if (exception instanceof UnauthorizedError) {
      status = 401;
      detail = exception.message;
    } else if (exception instanceof ForbiddenError) {
      status = 403;
      detail = exception.message;
    } else if (exception instanceof ConflictError) {
      status = 409;
      detail = exception.message;
    } else if (exception instanceof ValidationError) {
      status = 422;
      detail = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      detail =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : exception.message;
    }
    const title = TITLES[status] ?? 'Internal Server Error';

    response.status(status).json({
      ...(details !== undefined ? { details } : {}),
      detail,
      instance: request.url,
      status,
      title,
      type: 'about:blank',
    });
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  BadRequestError,
  DatabaseUnavailableError,
  NotFoundError,
} from '../errors';

/**
 * Global filter: every error leaves the API as an RFC 9457 problem
 * body ({ type, title, status, detail, instance }). No internals leak:
 * unexpected errors collapse to a generic 500 detail.
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred.';

    if (exception instanceof DatabaseUnavailableError) {
      status = 503;
      title = 'Service Unavailable';
      detail = exception.message;
    } else if (exception instanceof NotFoundError) {
      status = 404;
      title = 'Not Found';
      detail = exception.message;
    } else if (exception instanceof BadRequestError) {
      status = 400;
      title = 'Bad Request';
      detail = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = status === 404 ? 'Not Found' : 'Bad Request';
      const body = exception.getResponse();
      detail =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : exception.message;
    }

    response.status(status).json({
      detail,
      instance: request.url,
      status,
      title,
      type: 'about:blank',
    });
  }
}

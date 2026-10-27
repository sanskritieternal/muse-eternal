/** Domain errors. The ProblemFilter maps each to its RFC 9457 status. */

export class NotFoundError extends Error {
  constructor(message = 'Resource not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends Error {
  constructor(message = 'Bad request.') {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(message = 'Database is not available.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Conflict with the current state.') {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Validation failure carrying every field error at once (spec: all
 * errors shown at once, never one-at-a-time). */
export class ValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super('Validation failed.');
    this.name = 'ValidationError';
    this.details = details;
  }
}

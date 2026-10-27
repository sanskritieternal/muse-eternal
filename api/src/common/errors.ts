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

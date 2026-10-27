import { All, Controller } from '@nestjs/common';
import { NotFoundError } from '../common/errors';

/**
 * Unknown-route fallback. Express 5 needs the /*splat form for a
 * wildcard; this controller lives in its own module imported LAST so
 * it registers after every real route and cannot shadow them.
 */
@Controller()
export class FallbackController {
  @All('/*splat')
  all(): never {
    throw new NotFoundError('Route not found.');
  }
}

import { Controller, Get } from '@nestjs/common';
import { singleEnvelope } from '../common/envelope';

/** Liveness probe. No database dependency by design. */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return singleEnvelope({ status: 'ok' });
  }
}

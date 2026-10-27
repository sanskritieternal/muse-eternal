import { Controller, Get, Param, Query } from '@nestjs/common';
import { listEnvelope, singleEnvelope } from '../common/envelope';
import { GlossaryService } from './glossary.service';
import { toPublic } from './glossary.types';

/** Public reads only. No auth, no staff endpoints, no workflow states. */
@Controller('glossary')
export class GlossaryController {
  constructor(private readonly service: GlossaryService) {}

  @Get()
  async list(
    @Query('letter') letter?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.list({ cursor, letter, limit });
    return listEnvelope(result.items.map(toPublic), {
      cursor: result.cursor,
      hasMore: result.hasMore,
      limit: result.limit,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const row = await this.service.detail(slug);
    return singleEnvelope(toPublic(row));
  }
}

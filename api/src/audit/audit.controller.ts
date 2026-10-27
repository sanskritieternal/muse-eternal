import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { listEnvelope } from '../common/envelope';
import {
  CapabilitiesGuard,
  JwtAuthGuard,
  RequireCapabilities,
} from '../auth/auth.guard';
import { AUDIT_REPOSITORY, AuditRepository } from './audit.repository';
import { Inject } from '@nestjs/common';

/** Staff audit viewer. Requires `audit.view` (S01: Super Admin, Admin,
 * Support Agent). Events expose no secrets — payloads never contain
 * raw tokens or password material (see audit.service.ts). */
@Controller('staff/audit')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class AuditController {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly repository: AuditRepository,
  ) {}

  @Get()
  @RequireCapabilities('audit.view')
  async list(@Query('limit') limit?: string) {
    const parsed = Number(limit ?? 50);
    const take =
      Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 200) : 50;
    const rows = await this.repository.list(take);
    return listEnvelope(
      rows.map((row) => ({
        action: row.action,
        actorId: row.actorId,
        actorRoles: row.actorRoles,
        createdAt: row.createdAt.toISOString(),
        hash: row.hash,
        id: row.id,
        payload: row.payload,
        prevHash: row.prevHash,
        summary: row.summary,
        targetId: row.targetId,
        targetType: row.targetType,
      })),
      {
        cursor: null,
        hasMore: false,
        limit: take,
        nextCursor: null,
        total: rows.length,
      },
    );
  }
}

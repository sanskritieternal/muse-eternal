import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { DatabaseUnavailableError } from '../common/errors';
import {
  AuditEventInput,
  AuditEventRow,
  AuditRepository,
} from './audit.repository';

/**
 * Prisma-backed audit repository. Same no-DB contract as Phase 2: any
 * failure surfaces as DatabaseUnavailableError (→ 503), never 500.
 */
@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  private readonly client: PrismaClient | null;

  constructor() {
    let client: PrismaClient | null = null;
    try {
      client = new PrismaClient();
    } catch {
      client = null;
    }
    this.client = client;
  }

  async lastHash(): Promise<string | null> {
    try {
      const client = this.requireClient();
      const latest = await client.auditEvent.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
      });
      return latest?.hash ?? null;
    } catch (error) {
      throw this.asUnavailable(error);
    }
  }

  async append(event: AuditEventInput): Promise<AuditEventRow> {
    try {
      const client = this.requireClient();
      const row = await client.auditEvent.create({
        data: {
          action: event.action,
          actorId: event.actorId,
          actorRoles: event.actorRoles,
          hash: event.hash,
          payload: (event.payload ?? undefined) as Prisma.InputJsonValue | undefined,
          prevHash: event.prevHash,
          summary: event.summary,
          targetId: event.targetId,
          targetType: event.targetType,
        },
      });
      return {
        action: row.action,
        actorId: row.actorId,
        actorRoles: row.actorRoles,
        createdAt: row.createdAt,
        hash: row.hash,
        id: row.id,
        payload: (row.payload as Record<string, unknown> | null) ?? null,
        prevHash: row.prevHash,
        summary: row.summary,
        targetId: row.targetId,
        targetType: row.targetType,
      };
    } catch (error) {
      throw this.asUnavailable(error);
    }
  }

  async list(limit: number): Promise<AuditEventRow[]> {
    try {
      const client = this.requireClient();
      const rows = await client.auditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map((row) => ({
        action: row.action,
        actorId: row.actorId,
        actorRoles: row.actorRoles,
        createdAt: row.createdAt,
        hash: row.hash,
        id: row.id,
        payload: (row.payload as Record<string, unknown> | null) ?? null,
        prevHash: row.prevHash,
        summary: row.summary,
        targetId: row.targetId,
        targetType: row.targetType,
      }));
    } catch (error) {
      throw this.asUnavailable(error);
    }
  }

  private requireClient(): PrismaClient {
    if (!this.client) {
      throw new DatabaseUnavailableError();
    }
    return this.client;
  }

  private asUnavailable(error: unknown): Error {
    if (error instanceof DatabaseUnavailableError) {
      return error;
    }
    return new DatabaseUnavailableError();
  }
}

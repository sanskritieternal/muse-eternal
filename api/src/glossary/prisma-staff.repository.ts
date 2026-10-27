import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { DatabaseUnavailableError } from '../common/errors';
import { GlossaryTermRow } from './glossary.types';
import {
  AssignmentRow,
  RosterRow,
  StaffGlossaryRepository,
  VersionRow,
} from './staff.repository';

function asUnavailable(error: unknown): Error {
  if (error instanceof DatabaseUnavailableError) {
    return error;
  }
  return new DatabaseUnavailableError();
}

function toVersionRow(row: {
  actorId: string;
  changeSummary: string | null;
  createdAt: Date;
  documentId: string;
  id: string;
  major: number;
  minor: number;
  restoredFrom: string | null;
  snapshot: Prisma.JsonValue;
  transition: string;
  version: string;
}): VersionRow {
  return {
    ...row,
    snapshot: (row.snapshot as Record<string, unknown>) ?? {},
  };
}

function toAssignmentRow(row: {
  annotations: Prisma.JsonValue;
  createdAt: Date;
  documentId: string;
  dueAt: Date | null;
  escalated: boolean;
  id: string;
  notes: string | null;
  outcome: string;
  outcomeHistory: Prisma.JsonValue;
  poolEmpty: boolean;
  reviewerId: string | null;
  reviewType: string;
  roster: string | null;
  updatedAt: Date;
}): AssignmentRow {
  return {
    ...row,
    annotations: (row.annotations as Record<string, unknown> | null) ?? null,
    outcomeHistory:
      (row.outcomeHistory as Array<Record<string, unknown>> | null) ?? null,
  };
}

/**
 * Prisma-backed staff repository. Same no-DB contract as Phase 2:
 * any failure surfaces as DatabaseUnavailableError (→ 503).
 */
@Injectable()
export class PrismaStaffGlossaryRepository implements StaffGlossaryRepository {
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

  async createTerm(
    data: Partial<GlossaryTermRow>,
  ): Promise<GlossaryTermRow> {
    try {
      return await this.requireClient().glossaryTerm.create({
        data: data as Prisma.GlossaryTermCreateInput,
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async updateTerm(
    id: string,
    data: Partial<GlossaryTermRow>,
  ): Promise<GlossaryTermRow> {
    try {
      return await this.requireClient().glossaryTerm.update({
        data: data as Prisma.GlossaryTermUpdateInput,
        where: { id },
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async findBySlugStaff(slug: string): Promise<GlossaryTermRow | null> {
    try {
      return await this.requireClient().glossaryTerm.findUnique({
        where: { slug },
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async findByIdStaff(id: string): Promise<GlossaryTermRow | null> {
    try {
      return await this.requireClient().glossaryTerm.findUnique({
        where: { id },
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async listStaff(): Promise<GlossaryTermRow[]> {
    try {
      return await this.requireClient().glossaryTerm.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async createVersion(
    data: Omit<VersionRow, 'id' | 'createdAt'>,
  ): Promise<VersionRow> {
    try {
      const row = await this.requireClient().glossaryVersion.create({
        data: {
          actorId: data.actorId,
          changeSummary: data.changeSummary,
          documentId: data.documentId,
          major: data.major,
          minor: data.minor,
          restoredFrom: data.restoredFrom,
          snapshot: data.snapshot as Prisma.InputJsonValue,
          transition: data.transition,
          version: data.version,
        },
      });
      return toVersionRow(row);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async updateVersionSnapshot(
    id: string,
    snapshot: Record<string, unknown>,
  ): Promise<VersionRow> {
    try {
      const row = await this.requireClient().glossaryVersion.update({
        data: { snapshot: snapshot as Prisma.InputJsonValue },
        where: { id },
      });
      return toVersionRow(row);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async listVersions(documentId: string): Promise<VersionRow[]> {
    try {
      const rows = await this.requireClient().glossaryVersion.findMany({
        orderBy: [{ major: 'desc' }, { minor: 'desc' }],
        where: { documentId },
      });
      return rows.map(toVersionRow);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async latestVersion(documentId: string): Promise<VersionRow | null> {
    try {
      const row = await this.requireClient().glossaryVersion.findFirst({
        orderBy: [{ major: 'desc' }, { minor: 'desc' }, { createdAt: 'desc' }],
        where: { documentId },
      });
      return row ? toVersionRow(row) : null;
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async createAssignment(
    data: Omit<AssignmentRow, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AssignmentRow> {
    try {
      const row = await this.requireClient().reviewAssignment.create({
        data: {
          annotations: (data.annotations ?? undefined) as Prisma.InputJsonValue | undefined,
          documentId: data.documentId,
          dueAt: data.dueAt,
          escalated: data.escalated,
          notes: data.notes,
          outcome: data.outcome,
          outcomeHistory: (data.outcomeHistory ?? undefined) as Prisma.InputJsonValue | undefined,
          poolEmpty: data.poolEmpty,
          reviewerId: data.reviewerId,
          reviewType: data.reviewType,
          roster: data.roster,
        },
      });
      return toAssignmentRow(row);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async updateAssignment(
    id: string,
    data: Partial<AssignmentRow>,
  ): Promise<AssignmentRow> {
    try {
      const row = await this.requireClient().reviewAssignment.update({
        data: {
          annotations: (data.annotations ?? undefined) as Prisma.InputJsonValue | undefined,
          dueAt: data.dueAt,
          escalated: data.escalated,
          notes: data.notes,
          outcome: data.outcome,
          outcomeHistory: (data.outcomeHistory ?? undefined) as Prisma.InputJsonValue | undefined,
          reviewerId: data.reviewerId,
        },
        where: { id },
      });
      return toAssignmentRow(row);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async listAssignments(documentId: string): Promise<AssignmentRow[]> {
    try {
      const rows = await this.requireClient().reviewAssignment.findMany({
        orderBy: { createdAt: 'asc' },
        where: { documentId },
      });
      return rows.map(toAssignmentRow);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async rosterMembers(roster: string): Promise<RosterRow[]> {
    try {
      return await this.requireClient().rosterMembership.findMany({
        where: { roster },
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  private requireClient(): PrismaClient {
    if (!this.client) {
      throw new DatabaseUnavailableError();
    }
    return this.client;
  }
}

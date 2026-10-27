import { GlossaryTermRow } from './glossary.types';

/** Injection token for the staff data layer. */
export const STAFF_GLOSSARY_REPOSITORY = 'STAFF_GLOSSARY_REPOSITORY';

export interface VersionRow {
  actorId: string;
  changeSummary: string | null;
  createdAt: Date;
  documentId: string;
  id: string;
  major: number;
  minor: number;
  restoredFrom: string | null;
  snapshot: Record<string, unknown>;
  transition: string;
  version: string;
}

export interface AssignmentRow {
  annotations: Record<string, unknown> | null;
  createdAt: Date;
  documentId: string;
  dueAt: Date | null;
  escalated: boolean;
  id: string;
  notes: string | null;
  outcome: string;
  outcomeHistory: Array<Record<string, unknown>> | null;
  poolEmpty: boolean;
  reviewerId: string | null;
  reviewType: string;
  roster: string | null;
  updatedAt: Date;
}

export interface RosterRow {
  createdAt: Date;
  id: string;
  roster: string;
  userId: string;
}

/**
 * Staff data layer: terms (full rows, including drafts), versions,
 * assignments, roster membership. The public repository (Phase 2)
 * stays untouched — public reads keep their own path and gate.
 */
export interface StaffGlossaryRepository {
  createTerm(data: Partial<GlossaryTermRow>): Promise<GlossaryTermRow>;
  updateTerm(
    id: string,
    data: Partial<GlossaryTermRow>,
  ): Promise<GlossaryTermRow>;
  findBySlugStaff(slug: string): Promise<GlossaryTermRow | null>;
  findByIdStaff(id: string): Promise<GlossaryTermRow | null>;
  listStaff(): Promise<GlossaryTermRow[]>;
  createVersion(data: Omit<VersionRow, 'id' | 'createdAt'>): Promise<VersionRow>;
  updateVersionSnapshot(
    id: string,
    snapshot: Record<string, unknown>,
  ): Promise<VersionRow>;
  listVersions(documentId: string): Promise<VersionRow[]>;
  latestVersion(documentId: string): Promise<VersionRow | null>;
  createAssignment(
    data: Omit<AssignmentRow, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AssignmentRow>;
  updateAssignment(
    id: string,
    data: Partial<AssignmentRow>,
  ): Promise<AssignmentRow>;
  listAssignments(documentId: string): Promise<AssignmentRow[]>;
  rosterMembers(roster: string): Promise<RosterRow[]>;
}

/** Injection token for the audit data layer. */
export const AUDIT_REPOSITORY = 'AUDIT_REPOSITORY';

export interface AuditEventInput {
  action: string;
  actorId: string | null;
  actorRoles: string[];
  targetType: string | null;
  targetId: string | null;
  summary: string;
  payload: Record<string, unknown> | null;
  prevHash: string;
  hash: string;
}

export interface AuditEventRow extends AuditEventInput {
  id: string;
  createdAt: Date;
}

export interface AuditRepository {
  /** Hash of the most recent event, or null when the log is empty. */
  lastHash(): Promise<string | null>;
  append(event: AuditEventInput): Promise<AuditEventRow>;
  list(limit: number): Promise<AuditEventRow[]>;
}

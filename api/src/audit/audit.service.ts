import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_REPOSITORY, AuditEventInput, AuditRepository } from './audit.repository';

/**
 * The 15-value SYS-17 standard action vocabulary (sys-17 §10). The
 * helper rejects anything else — no module-specific action strings.
 * Auth events map onto it: successful logins → `login` (elevated
 * logins carry elevated/mfa in the payload per S01 E-9); failed
 * logins → `login` with success:false (same shape, per E-9);
 * refresh → `login` with kind:'token_refresh' (no dedicated refresh
 * value exists in the vocabulary); denials → `permission_change`
 * with denied:true (the vocabulary's own meaning for that value).
 */
export const AUDIT_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'published',
  'unpublished',
  'login',
  'logout',
  'permission_change',
  'export',
  'import',
  'settings_change',
  'view',
  'tamper_check',
  'retention_run',
  'archive',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEmitInput {
  action: AuditAction;
  actorId?: string | null;
  actorRoles?: string[];
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
  payload?: Record<string, unknown> | null;
}

/** Canonical JSON: recursively sorted keys, so the hash is stable. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

export function hashEvent(prevHash: string, payload: unknown): string {
  return createHash('sha256')
    .update(`${prevHash}||${canonicalJson(payload)}`)
    .digest('hex');
}

export const GENESIS_HASH = 'GENESIS';

/**
 * The single audit helper (SYS-17 §5.4, S32 §5): every auth and
 * workflow decision emits through here, never by direct writes.
 * Secrets are never placed in payloads (token hashes only, never raw
 * tokens; password hashes never).
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly repository: AuditRepository,
  ) {}

  async emit(input: AuditEmitInput): Promise<void> {
    if (!(AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
      throw new Error(`Audit action not in vocabulary: ${input.action}`);
    }
    const prevHash = (await this.repository.lastHash()) ?? GENESIS_HASH;
    const event: AuditEventInput = {
      action: input.action,
      actorId: input.actorId ?? null,
      actorRoles: input.actorRoles ?? [],
      hash: '',
      payload: input.payload ?? null,
      prevHash,
      summary: input.summary,
      targetId: input.targetId ?? null,
      targetType: input.targetType ?? null,
    };
    event.hash = hashEvent(prevHash, {
      action: event.action,
      actorId: event.actorId,
      actorRoles: event.actorRoles,
      payload: event.payload,
      summary: event.summary,
      targetId: event.targetId,
      targetType: event.targetType,
    });
    await this.repository.append(event);
  }
}

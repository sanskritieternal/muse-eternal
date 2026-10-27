import { Inject, Injectable } from '@nestjs/common';
import { WorkflowState } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../common/errors';
import { AuthPrincipal } from '../auth/auth.guard';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../auth/auth.repository';
import {
  capabilitiesForRoles,
  isSuperAdmin,
  passesTwoKeyPublish,
} from '../auth/capabilities';
import { GlossaryTermRow, toStaff } from './glossary.types';
import {
  AssignmentRow,
  STAFF_GLOSSARY_REPOSITORY,
  StaffGlossaryRepository,
  VersionRow,
} from './staff.repository';
import {
  GlossaryInput,
  validateGlossaryInput,
} from './validation';

/** Injection token for the workflow configuration. */
export const WORKFLOW_CONFIG = 'WORKFLOW_CONFIG';

export interface WorkflowConfig {
  /** S32 K-1 (default true). */
  requireReviewer: boolean;
  /** S32 K-2 (default false): publish is never automatic. */
  autoPublishOnApprove: boolean;
  /** Auto-reassign hours past breach (default 72; 0 = off). */
  autoReassignHours: number;
  /** G01 review SLA: specialist track (Glossary Approver) default 72h. */
  reviewSlaHours: number;
  /** Autosave coalescing window (O-8 decision: 5 minutes). */
  coalesceMinutes: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  return raw === 'true';
}

export function loadWorkflowConfig(): WorkflowConfig {
  return {
    autoPublishOnApprove: envBool(
      'SYS32_AUTO_PUBLISH_ON_APPROVE',
      false,
    ),
    autoReassignHours: envInt('SYS32_AUTO_REASSIGN_HOURS', 72),
    coalesceMinutes: 5,
    requireReviewer: envBool('SYS32_REQUIRE_REVIEWER', true),
    reviewSlaHours: envInt('SYS32_REVIEW_SLA_HOURS', 72),
  };
}

const STATE_ORDER: Record<WorkflowState, number> = {
  DRAFT: 0,
  REVIEW: 1,
  APPROVE: 2,
  PUBLISHED: 3,
};

const STATE_NAMES: Record<WorkflowState, string> = {
  APPROVE: 'approve',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REVIEW: 'review',
};

/** G01 has a single review track: the Glossary Approver specialist. */
export const GLOSSARY_APPROVER_ROSTER = 'glossary_approver';

export function versionLabel(major: number, minor: number): string {
  return `v${major}.${minor}`;
}

function snapshotOf(row: GlossaryTermRow): Record<string, unknown> {
  const staff = toStaff(row);
  return JSON.parse(JSON.stringify(staff)) as Record<string, unknown>;
}

function changedFields(
  before: GlossaryTermRow,
  after: Partial<GlossaryTermRow>,
): string[] {
  return Object.keys(after).filter(
    (key) =>
      JSON.stringify((before as Record<string, unknown>)[key]) !==
      JSON.stringify((after as Record<string, unknown>)[key]),
  );
}

/**
 * S32 workflow on G01, with the S01 matrix governing every permission
 * decision. Where the S32 §4 role table disagrees with the S01 matrix
 * (it grants Admin create/submit/approve/restore/assign/break-glass),
 * the MATRIX governs and Admin is denied — flagged in the Phase 3
 * report; the guards enforce capabilities, this service enforces
 * states, gates, and versions. State guards return 409, gate failures
 * 422, missing documents 404.
 *
 * Deferred (not implemented here, per the Phase 3 brief): schedule
 * publish (T-5), version restore (T-7), SEO pre-publish gate, bulk
 * actions, webhooks, notifications, rate limiting, idempotency keys.
 */
@Injectable()
export class WorkflowService {
  private readonly config: WorkflowConfig;

  constructor(
    @Inject(STAFF_GLOSSARY_REPOSITORY)
    private readonly repo: StaffGlossaryRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly audit: AuditService,
    @Inject(WORKFLOW_CONFIG)
    config: WorkflowConfig,
  ) {
    this.config = config;
  }

  async createDraft(
    actor: AuthPrincipal,
    input: GlossaryInput,
  ): Promise<GlossaryTermRow> {
    validateGlossaryInput(input, { requireAll: true });
    const slug = input.slug as string;
    const existing = await this.repo.findBySlugStaff(slug);
    if (existing) {
      throw new ValidationError(['Slug is already in use.']);
    }
    const row = await this.repo.createTerm({
      audioTracks: (input.audioTracks as never) ?? undefined,
      banner: input.banner as string,
      devanagari: input.devanagari as string,
      extendedDefinition: (input.extendedDefinition as string) ?? undefined,
      faqItems: (input.faqItems as never) ?? undefined,
      imageGallery: (input.imageGallery as never) ?? undefined,
      languageOfOrigin: input.languageOfOrigin as never,
      localeStates: (input.localeStates as never) ?? undefined,
      partOfSpeech: (input.partOfSpeech as string) ?? undefined,
      printablePdfs: (input.printablePdfs as never) ?? undefined,
      published: false,
      regionalEquivalents: (input.regionalEquivalents as never) ?? undefined,
      rightsHolder: input.rightsHolder as string,
      shortDefinition: input.shortDefinition as string,
      shortDescription: input.shortDescription as string,
      slug,
      summary: (input.summary as string) ?? undefined,
      termIast: input.termIast as string,
      tierVisibility: (input.tierVisibility as never) ?? undefined,
      title: input.title as string,
      traditionMeanings: (input.traditionMeanings as never) ?? undefined,
      videoItems: (input.videoItems as never) ?? undefined,
      vocabularyRequired:
        typeof input.vocabularyRequired === 'boolean'
          ? input.vocabularyRequired
          : undefined,
      workflowState: 'DRAFT',
    });
    await this.writeVersion(row, 1, 0, 'created', actor.id, null);
    await this.audit.emit({
      action: 'created',
      actorId: actor.id,
      actorRoles: actor.roles,
      summary: `Glossary term created: ${row.slug}.`,
      targetId: row.id,
      targetType: 'glossary_term',
    });
    return row;
  }

  async updateDraft(
    actor: AuthPrincipal,
    slug: string,
    input: GlossaryInput,
    options: { autosave: boolean },
  ): Promise<GlossaryTermRow> {
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'DRAFT') {
      throw new ConflictError(
        `Only Draft documents can be edited (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    // Workflow-managed fields never change through content edits.
    const { workflowState: _ws, published: _pub, ...rest } = input as Record<
      string,
      unknown
    >;
    void _ws;
    void _pub;
    const merged = { ...termToInput(row), ...rest };
    validateGlossaryInput(merged, { requireAll: false });
    if (
      typeof rest.slug === 'string' &&
      rest.slug !== row.slug
    ) {
      const clash = await this.repo.findBySlugStaff(rest.slug);
      if (clash) {
        throw new ValidationError(['Slug is already in use.']);
      }
    }
    const updated = await this.repo.updateTerm(row.id, {
      ...(rest as Partial<GlossaryTermRow>),
    });
    const fields = changedFields(row, rest as Partial<GlossaryTermRow>);
    await this.versionAfterEdit(updated, actor, options.autosave);
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: { changedFields: fields },
      summary: `Glossary term updated: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    return updated;
  }

  /** Translator path: locale overlay only, Draft only. */
  async updateLocale(
    actor: AuthPrincipal,
    slug: string,
    localeStates: Record<string, string>,
  ): Promise<GlossaryTermRow> {
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'DRAFT') {
      throw new ConflictError(
        `Locale fields can only be edited in Draft (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    validateGlossaryInput(
      { localeStates, slug: row.slug },
      { requireAll: false },
    );
    const updated = await this.repo.updateTerm(row.id, {
      localeStates: localeStates as never,
    });
    await this.versionAfterEdit(updated, actor, false);
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: { changedFields: ['localeStates'] },
      summary: `Locale states updated: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    return updated;
  }

  async submit(
    actor: AuthPrincipal,
    slug: string,
    body: { note?: string; reviewerId?: string },
  ): Promise<{
    assignments: AssignmentRow[];
    term: GlossaryTermRow;
    version: string;
  }> {
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'DRAFT') {
      throw new ConflictError(
        `Only Draft documents can be submitted (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    const roster = await this.repo.rosterMembers(GLOSSARY_APPROVER_ROSTER);
    const rosterIds = roster.map((member) => member.userId);
    let reviewerId: string | null = null;
    let poolEmpty = false;
    if (body.reviewerId) {
      reviewerId = await this.validateReviewer(
        body.reviewerId,
        rosterIds,
      );
    } else if (rosterIds.length === 0) {
      // P-5 pool-empty path: the assignment exists but names nobody;
      // the review queue shows it as unassigned and J-2 escalates it.
      poolEmpty = true;
    } else if (this.config.requireReviewer) {
      throw new ValidationError([
        'A reviewer must be assigned (SYS32_REVIEWER_REQUIRED).',
      ]);
    }
    const now = new Date();
    const assignment = await this.repo.createAssignment({
      annotations: null,
      documentId: row.id,
      dueAt: new Date(now.getTime() + this.config.reviewSlaHours * 3_600_000),
      escalated: false,
      notes: body.note ?? null,
      outcome: 'pending',
      outcomeHistory: null,
      poolEmpty,
      reviewerId,
      reviewType: 'specialist',
      roster: GLOSSARY_APPROVER_ROSTER,
    });
    const updated = await this.repo.updateTerm(row.id, {
      submittedAt: now,
      submittedBy: actor.id,
      workflowState: 'REVIEW',
    });
    const version = await this.transitionVersion(
      updated,
      'draft → review',
      actor.id,
      body.note ?? null,
    );
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: {
        assignments: [assignment.id],
        after: { workflowState: 'review' },
        before: { workflowState: 'draft' },
      },
      summary: `Glossary term submitted for review: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    return { assignments: [assignment], term: updated, version };
  }

  /** Set one assignment's outcome (reviewer action, A-2). */
  async setOutcome(
    actor: AuthPrincipal,
    slug: string,
    assignmentId: string,
    body: {
      annotations?: Record<string, unknown>;
      notes?: string;
      outcome: 'approved' | 'approved_with_edits' | 'returned';
    },
  ): Promise<{ assignment: AssignmentRow; term: GlossaryTermRow }> {
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'REVIEW') {
      throw new ConflictError(
        `Outcomes can only be set in Review (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    const assignments = await this.repo.listAssignments(row.id);
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new NotFoundError('Review assignment not found.');
    }
    if (assignment.outcome !== 'pending') {
      throw new ConflictError(
        `Assignment already decided (outcome: ${assignment.outcome}).`,
      );
    }
    if (
      (body.outcome === 'returned' || body.outcome === 'approved_with_edits') &&
      (!body.notes || body.notes.trim().length === 0)
    ) {
      throw new ValidationError([
        'Review notes are mandatory for Returned and Approved-with-edits outcomes.',
      ]);
    }
    if (body.outcome === 'approved') {
      const updatedAssignment = await this.repo.updateAssignment(
        assignment.id,
        {
          notes: body.notes ?? null,
          outcome: 'approved',
        },
      );
      await this.audit.emit({
        action: 'updated',
        actorId: actor.id,
        actorRoles: actor.roles,
        payload: { assignmentId: assignment.id, outcome: 'approved' },
        summary: `Review assignment approved on ${row.slug}.`,
        targetId: row.id,
        targetType: 'glossary_term',
      });
      return { assignment: updatedAssignment, term: row };
    }
    // approved_with_edits: annotations recorded, document returns to
    // the editor (Draft); the reviewer never rewrites content (D-9).
    // returned: reason required, document returns to Draft, and ALL
    // assignments re-open as Pending with history preserved (T-3).
    const now = new Date();
    const historyEntry = {
      at: now.toISOString(),
      by: actor.id,
      notes: body.notes ?? null,
      outcome: assignment.outcome,
    };
    const history = [...(assignment.outcomeHistory ?? []), historyEntry];
    if (body.outcome === 'approved_with_edits') {
      const updatedAssignment = await this.repo.updateAssignment(
        assignment.id,
        {
          annotations: body.annotations ?? null,
          notes: body.notes ?? null,
          outcome: 'approved_with_edits',
          outcomeHistory: history,
        },
      );
      const updated = await this.repo.updateTerm(row.id, {
        workflowState: 'DRAFT',
      });
      await this.transitionVersion(
        updated,
        'review → draft (approved with edits)',
        actor.id,
        body.notes ?? null,
      );
      await this.audit.emit({
        action: 'updated',
        actorId: actor.id,
        actorRoles: actor.roles,
        payload: {
          after: { workflowState: 'draft' },
          annotations: body.annotations ?? null,
          before: { workflowState: 'review' },
        },
        summary: `Glossary term approved with edits: ${updated.slug}.`,
        targetId: updated.id,
        targetType: 'glossary_term',
      });
      return { assignment: updatedAssignment, term: updated };
    }
    // returned
    for (const item of assignments) {
      await this.repo.updateAssignment(item.id, {
        notes: item.id === assignment.id ? (body.notes ?? null) : item.notes,
        outcome: 'pending',
        outcomeHistory: [
          ...(item.outcomeHistory ?? []),
          {
            at: now.toISOString(),
            by: actor.id,
            notes: item.id === assignment.id ? (body.notes ?? null) : null,
            outcome: item.outcome,
          },
        ],
      });
    }
    const updated = await this.repo.updateTerm(row.id, {
      returnReason: body.notes ?? null,
      returnedAt: now,
      returnedBy: actor.id,
      workflowState: 'DRAFT',
    });
    await this.transitionVersion(
      updated,
      'review → draft (returned)',
      actor.id,
      body.notes ?? null,
    );
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: {
        after: { workflowState: 'draft' },
        before: { workflowState: 'review' },
        reason: body.notes ?? null,
      },
      summary: `Glossary term returned for revision: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    const refreshed = await this.repo.listAssignments(row.id);
    const self = refreshed.find((item) => item.id === assignment.id);
    return {
      assignment: self ?? assignment,
      term: updated,
    };
  }

  /** T-2 approve: Review → Approve. All assignments must be Approved. */
  async approve(
    actor: AuthPrincipal,
    slug: string,
    body: { changeSummary?: string },
  ): Promise<{
    autoPublished: boolean;
    term: GlossaryTermRow;
    version: string;
  }> {
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'REVIEW') {
      throw new ConflictError(
        `Only Review documents can be approved (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    if (!body.changeSummary || body.changeSummary.trim().length === 0) {
      throw new ValidationError(['changeSummary is required to approve.']);
    }
    const assignments = await this.repo.listAssignments(row.id);
    const incomplete = assignments.filter(
      (item) => item.outcome !== 'approved',
    );
    if (assignments.length === 0 || incomplete.length > 0) {
      throw new ValidationError([
        'reviews_incomplete: all review assignments must be Approved before approval.',
      ]);
    }
    const updated = await this.repo.updateTerm(row.id, {
      workflowState: 'APPROVE',
    });
    const version = await this.transitionVersion(
      updated,
      'review → approve',
      actor.id,
      body.changeSummary,
    );
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: {
        after: { workflowState: 'approve' },
        before: { workflowState: 'review' },
        changeSummary: body.changeSummary,
      },
      summary: `Glossary term approved: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    let autoPublished = false;
    let term = updated;
    if (this.config.autoPublishOnApprove) {
      // Same gates, same two-key authorization, evaluated against the
      // approver: a Reviewer approver lacks publish authority, so the
      // document stays in Approve (never silently published).
      if (passesTwoKeyPublish(actor.roles)) {
        try {
          const published = await this.publishInternal(
            actor,
            updated,
            body.changeSummary,
          );
          term = published;
          autoPublished = true;
        } catch {
          // Gate failure or state error: stay in Approve.
          autoPublished = false;
        }
      }
    }
    return { autoPublished, term, version };
  }

  /** T-4 publish: Approve → Published (two-key rule). */
  async publish(
    actor: AuthPrincipal,
    slug: string,
    body: { changeSummary?: string },
  ): Promise<{
    gates: Array<{ gate: string; status: string }>;
    term: GlossaryTermRow;
    version: string;
  }> {
    if (!passesTwoKeyPublish(actor.roles)) {
      await this.audit.emit({
        action: 'permission_change',
        actorId: actor.id,
        actorRoles: actor.roles,
        payload: { denied: true, rule: 'two_key_publish' },
        summary: 'Publish denied: two-key rule not satisfied.',
        targetType: 'glossary_term',
      });
      throw new ForbiddenError(
        'Publish requires the content.publish capability AND Publish Authority membership.',
      );
    }
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'APPROVE') {
      throw new ConflictError(
        `Only Approve documents can be published (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    if (!body.changeSummary || body.changeSummary.trim().length === 0) {
      throw new ValidationError(['changeSummary is required to publish.']);
    }
    const term = await this.publishInternal(actor, row, body.changeSummary);
    const latest = await this.repo.latestVersion(term.id);
    return {
      gates: [
        { gate: 'mandatory_fields', status: 'pass' },
        { gate: 'specialist_reviews_complete', status: 'pass' },
        { gate: 'seo_markup_valid', status: 'skipped (deferred)' },
      ],
      term,
      version: latest ? latest.version : 'v1.0',
    };
  }

  /** T-4 unpublish: Published → Draft (two-key rule). */
  async unpublish(
    actor: AuthPrincipal,
    slug: string,
    body: { handling?: 'archive' | 'soft' },
  ): Promise<GlossaryTermRow> {
    if (!passesTwoKeyPublish(actor.roles)) {
      await this.audit.emit({
        action: 'permission_change',
        actorId: actor.id,
        actorRoles: actor.roles,
        payload: { denied: true, rule: 'two_key_publish' },
        summary: 'Unpublish denied: two-key rule not satisfied.',
        targetType: 'glossary_term',
      });
      throw new ForbiddenError(
        'Unpublish requires the content.publish capability AND Publish Authority membership.',
      );
    }
    const row = await this.loadStaff(slug);
    if (row.workflowState !== 'PUBLISHED') {
      throw new ConflictError(
        `Only Published documents can be unpublished (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    const handling = body.handling ?? 'soft';
    const updated = await this.repo.updateTerm(row.id, {
      archivedAt: handling === 'archive' ? new Date() : null,
      published: false,
      workflowState: 'DRAFT',
    });
    await this.transitionVersion(
      updated,
      'published → draft (unpublished)',
      actor.id,
      `Unpublished (${handling}).`,
    );
    await this.audit.emit({
      action: 'unpublished',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: {
        after: { workflowState: 'draft' },
        before: { workflowState: 'published' },
        handling,
      },
      summary: `Glossary term unpublished: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    return updated;
  }

  /**
   * Break-glass: force any FORWARD transition (Super Admin only,
   * narrowed rule). Mandatory reason; the audit event carries
   * breakGlass:true, the reason, and the skipped states. Never a
   * normal UI affordance — a dedicated emergency action only.
   */
  async breakGlass(
    actor: AuthPrincipal,
    slug: string,
    body: { reason?: string; to?: string },
  ): Promise<GlossaryTermRow> {
    if (!isSuperAdmin(actor.roles)) {
      await this.audit.emit({
        action: 'permission_change',
        actorId: actor.id,
        actorRoles: actor.roles,
        payload: { denied: true, rule: 'break_glass_super_admin_only' },
        summary: 'Break-glass denied: Super Admin only.',
        targetType: 'glossary_term',
      });
      throw new ForbiddenError('Break-glass is restricted to Super Admin.');
    }
    if (!body.reason || body.reason.trim().length === 0) {
      throw new ValidationError(['A reason is mandatory for break-glass.']);
    }
    const target = (body.to ?? '').toUpperCase() as WorkflowState;
    if (!(target in STATE_ORDER)) {
      throw new BadRequestError(
        'Break-glass target must be draft, review, approve, or published.',
      );
    }
    const row = await this.loadStaff(slug);
    if (STATE_ORDER[target] <= STATE_ORDER[row.workflowState]) {
      throw new ConflictError(
        `Break-glass only forces FORWARD transitions (current state: ${STATE_NAMES[row.workflowState]}).`,
      );
    }
    const skipped = (Object.keys(STATE_ORDER) as WorkflowState[]).filter(
      (state) =>
        STATE_ORDER[state] > STATE_ORDER[row.workflowState] &&
        STATE_ORDER[state] < STATE_ORDER[target],
    );
    const now = new Date();
    const toPublished = target === 'PUBLISHED';
    const updated = await this.repo.updateTerm(row.id, {
      published: toPublished,
      publishedAt: toPublished ? now : row.publishedAt,
      publishedBy: toPublished ? actor.id : row.publishedBy,
      workflowState: target,
    });
    if (toPublished) {
      const latest = await this.repo.latestVersion(row.id);
      const major = (latest?.major ?? 1) + 1;
      await this.writeVersion(updated, major, 0, 'break-glass → published', actor.id, body.reason);
    } else {
      await this.transitionVersion(
        updated,
        `break-glass → ${STATE_NAMES[target]}`,
        actor.id,
        body.reason,
      );
    }
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: {
        after: { workflowState: STATE_NAMES[target] },
        before: { workflowState: STATE_NAMES[row.workflowState] },
        breakGlass: true,
        reason: body.reason,
        skipped: skipped.map((state) => STATE_NAMES[state]),
      },
      summary: `Break-glass transition on ${updated.slug}: ${STATE_NAMES[row.workflowState]} → ${STATE_NAMES[target]}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    return updated;
  }

  /** Reassign one pending assignment (content.review; own queue or admin). */
  async reassign(
    actor: AuthPrincipal,
    slug: string,
    assignmentId: string,
    body: { reviewerId: string },
  ): Promise<AssignmentRow> {
    const row = await this.loadStaff(slug);
    const assignments = await this.repo.listAssignments(row.id);
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new NotFoundError('Review assignment not found.');
    }
    if (assignment.outcome !== 'pending') {
      throw new ConflictError(
        `Only pending assignments can be reassigned (outcome: ${assignment.outcome}).`,
      );
    }
    const roster = await this.repo.rosterMembers(GLOSSARY_APPROVER_ROSTER);
    const reviewerId = await this.validateReviewer(
      body.reviewerId,
      roster.map((member) => member.userId),
    );
    const updated = await this.repo.updateAssignment(assignment.id, {
      dueAt: new Date(
        Date.now() + this.config.reviewSlaHours * 3_600_000,
      ),
      escalated: false,
      reviewerId,
    });
    await this.audit.emit({
      action: 'updated',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: { assignmentId, reviewerId },
      summary: `Review assignment reassigned on ${row.slug}.`,
      targetId: row.id,
      targetType: 'glossary_term',
    });
    return updated;
  }

  /**
   * SLA sweep (J-2 shape, without the scheduler — the scheduled trigger
   * is a system-service item; this function is what it will call).
   * Overdue = past dueAt + autoReassignHours. Reassigns round-robin to
   * the next roster member; when no other member exists, marks the
   * assignment escalated instead of inventing an assignee.
   */
  async reassignOverdue(
    actor: AuthPrincipal | null,
    now: Date,
  ): Promise<{ escalated: number; reassigned: number }> {
    if (this.config.autoReassignHours === 0) {
      return { escalated: 0, reassigned: 0 };
    }
    const roster = await this.repo.rosterMembers(GLOSSARY_APPROVER_ROSTER);
    const rosterIds = roster.map((member) => member.userId);
    const terms = await this.repo.listStaff();
    let reassigned = 0;
    let escalated = 0;
    const breachMs = this.config.autoReassignHours * 3_600_000;
    for (const term of terms) {
      const assignments = await this.repo.listAssignments(term.id);
      for (const assignment of assignments) {
        if (assignment.outcome !== 'pending' || !assignment.dueAt) {
          continue;
        }
        if (now.getTime() <= assignment.dueAt.getTime() + breachMs) {
          continue;
        }
        const others = rosterIds.filter(
          (id) => id !== assignment.reviewerId,
        );
        if (others.length === 0) {
          if (!assignment.escalated) {
            await this.repo.updateAssignment(assignment.id, {
              escalated: true,
            });
            escalated += 1;
          }
          continue;
        }
        // Next roster member after the current reviewer, wrapping;
        // deterministic (no sweep state is kept anywhere).
        const currentIndex = rosterIds.indexOf(
          assignment.reviewerId ?? '',
        );
        let next = others[0];
        for (let step = 1; step <= rosterIds.length; step += 1) {
          const candidate =
            rosterIds[(currentIndex + step) % rosterIds.length];
          if (candidate !== assignment.reviewerId) {
            next = candidate;
            break;
          }
        }
        await this.repo.updateAssignment(assignment.id, {
          dueAt: new Date(now.getTime() + this.config.reviewSlaHours * 3_600_000),
          escalated: false,
          reviewerId: next,
        });
        reassigned += 1;
        await this.audit.emit({
          action: 'updated',
          actorId: actor?.id ?? null,
          actorRoles: actor?.roles ?? [],
          payload: { assignmentId: assignment.id, reviewerId: next },
          summary: `Overdue review assignment auto-reassigned on ${term.slug}.`,
          targetId: term.id,
          targetType: 'glossary_term',
        });
      }
    }
    return { escalated, reassigned };
  }

  async listVersions(
    slug: string,
  ): Promise<VersionRow[]> {
    const row = await this.loadStaff(slug);
    return this.repo.listVersions(row.id);
  }

  async listAssignments(
    slug: string,
  ): Promise<AssignmentRow[]> {
    const row = await this.loadStaff(slug);
    return this.repo.listAssignments(row.id);
  }

  async listStaffTerms(): Promise<GlossaryTermRow[]> {
    const rows = await this.repo.listStaff();
    // Archived (unpublish with handling=archive) rows are excluded
    // from the default staff list; they remain reachable via versions.
    return rows.filter((row) => row.archivedAt === null);
  }

  async loadStaffTerm(slug: string): Promise<GlossaryTermRow> {
    return this.loadStaff(slug);
  }

  /**
   * Reviewer picker (O-12): roster-filtered. When the roster is empty,
   * the picker is empty and submits take the pool-empty path — the
   * picker never invents reviewers.
   */
  async listReviewers(): Promise<
    Array<{ id: string; email: string; roles: string[] }>
  > {
    const roster = await this.repo.rosterMembers(GLOSSARY_APPROVER_ROSTER);
    const reviewers: Array<{ email: string; id: string; roles: string[] }> = [];
    for (const member of roster) {
      const user = await this.users.findById(member.userId);
      if (user) {
        reviewers.push({
          email: user.email,
          id: user.id,
          roles: user.roles,
        });
      }
    }
    return reviewers;
  }

  private async loadStaff(slug: string): Promise<GlossaryTermRow> {
    const row = await this.repo.findBySlugStaff(slug);
    if (!row) {
      throw new NotFoundError('Glossary term not found.');
    }
    return row;
  }

  private async validateReviewer(
    reviewerId: string,
    rosterIds: string[],
  ): Promise<string> {
    const user = await this.users.findById(reviewerId);
    if (!user) {
      throw new ValidationError(['Reviewer not found.']);
    }
    if (!capabilitiesForRoles(user.roles).includes('content.review')) {
      throw new ValidationError([
        'Reviewer must hold the content.review capability.',
      ]);
    }
    if (rosterIds.length > 0 && !rosterIds.includes(reviewerId)) {
      throw new ValidationError([
        'Reviewer is not on the Glossary Approver roster.',
      ]);
    }
    return reviewerId;
  }

  /** Shared publish path (used by publish + auto-publish-on-approve). */
  private async publishInternal(
    actor: AuthPrincipal,
    row: GlossaryTermRow,
    changeSummary: string,
  ): Promise<GlossaryTermRow> {
    // Gate 1: mandatory fields (full stored term, all errors at once).
    validateGlossaryInput(termToInput(row), { requireAll: true });
    // Gate 2: specialist reviews complete (re-checked at publish time).
    const assignments = await this.repo.listAssignments(row.id);
    const incomplete = assignments.filter(
      (item) => item.outcome !== 'approved',
    );
    if (assignments.length === 0 || incomplete.length > 0) {
      throw new ValidationError([
        'specialist_reviews_complete: all review assignments must be Approved before publish.',
      ]);
    }
    // Gate 3 (seo_markup_valid) is DEFERRED per the Phase 3 brief —
    // publish does not check it; the response reports it as skipped.
    const now = new Date();
    const updated = await this.repo.updateTerm(row.id, {
      published: true,
      publishedAt: now,
      publishedBy: actor.id,
      workflowState: 'PUBLISHED',
    });
    const latest = await this.repo.latestVersion(row.id);
    const major = (latest?.major ?? 1) + 1;
    await this.writeVersion(
      updated,
      major,
      0,
      'approve → published',
      actor.id,
      changeSummary,
    );
    await this.audit.emit({
      action: 'published',
      actorId: actor.id,
      actorRoles: actor.roles,
      payload: {
        after: { workflowState: 'published' },
        before: { workflowState: 'approve' },
        gates: ['mandatory_fields', 'specialist_reviews_complete'],
        version: versionLabel(major, 0),
      },
      summary: `Glossary term published: ${updated.slug}.`,
      targetId: updated.id,
      targetType: 'glossary_term',
    });
    return updated;
  }

  /** Minor-bump version for a transition (or 'created' v1.0). */
  private async transitionVersion(
    row: GlossaryTermRow,
    transition: string,
    actorId: string,
    changeSummary: string | null,
  ): Promise<string> {
    const latest = await this.repo.latestVersion(row.id);
    const major = latest?.major ?? 1;
    const minor = (latest?.minor ?? 0) + 1;
    await this.writeVersion(row, major, minor, transition, actorId, changeSummary);
    return versionLabel(major, minor);
  }

  private async writeVersion(
    row: GlossaryTermRow,
    major: number,
    minor: number,
    transition: string,
    actorId: string,
    changeSummary: string | null,
  ): Promise<VersionRow> {
    return this.repo.createVersion({
      actorId,
      changeSummary,
      documentId: row.id,
      major,
      minor,
      restoredFrom: null,
      snapshot: snapshotOf(row),
      transition,
      version: versionLabel(major, minor),
    });
  }

  /**
   * Edit versioning with O-8 autosave coalescing: consecutive autosaves
   * by the same author within 5 minutes, with no intervening transition
   * version, merge into one version (latest payload wins, earliest
   * timestamp kept — implemented by updating the autosave version's
   * snapshot in place). Explicit saves ALWAYS append a new version.
   */
  private async versionAfterEdit(
    row: GlossaryTermRow,
    actor: AuthPrincipal,
    autosave: boolean,
  ): Promise<void> {
    const latest = await this.repo.latestVersion(row.id);
    const now = new Date();
    if (
      autosave &&
      latest &&
      latest.transition === 'autosave' &&
      latest.actorId === actor.id &&
      now.getTime() - latest.createdAt.getTime() <
        this.config.coalesceMinutes * 60_000
    ) {
      await this.repo.updateVersionSnapshot(latest.id, snapshotOf(row));
      return;
    }
    const major = latest?.major ?? 1;
    const minor = (latest?.minor ?? 0) + 1;
    await this.writeVersion(
      row,
      major,
      minor,
      autosave ? 'autosave' : 'edit',
      actor.id,
      null,
    );
  }
}

function termToInput(row: GlossaryTermRow): GlossaryInput {
  return {
    audioTracks: row.audioTracks as never,
    banner: row.banner,
    devanagari: row.devanagari,
    extendedDefinition: row.extendedDefinition ?? undefined,
    faqItems: row.faqItems as never,
    imageGallery: row.imageGallery as never,
    languageOfOrigin: row.languageOfOrigin,
    localeStates: row.localeStates as never,
    partOfSpeech: row.partOfSpeech ?? undefined,
    printablePdfs: row.printablePdfs as never,
    regionalEquivalents: row.regionalEquivalents as never,
    rightsHolder: row.rightsHolder,
    shortDefinition: row.shortDefinition,
    shortDescription: row.shortDescription,
    slug: row.slug,
    summary: row.summary ?? undefined,
    termIast: row.termIast,
    tierVisibility: row.tierVisibility,
    title: row.title,
    traditionMeanings: row.traditionMeanings as never,
    videoItems: row.videoItems as never,
    vocabularyRequired: row.vocabularyRequired,
  };
}

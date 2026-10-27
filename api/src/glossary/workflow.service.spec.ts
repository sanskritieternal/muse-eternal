import { AuditService } from '../audit/audit.service';
import {
  AuditEventInput,
  AuditEventRow,
  AuditRepository,
} from '../audit/audit.repository';
import { AuthPrincipal } from '../auth/auth.guard';
import {
  StaffUserRow,
  UserRepository,
} from '../auth/auth.repository';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../common/errors';
import { GlossaryTermRow } from './glossary.types';
import {
  AssignmentRow,
  RosterRow,
  StaffGlossaryRepository,
  VersionRow,
} from './staff.repository';
import { GlossaryInput } from './validation';
import {
  WorkflowConfig,
  WorkflowService,
} from './workflow.service';

const VALID_INPUT: GlossaryInput = {
  banner: 'banner.jpg',
  devanagari: 'धर्म',
  languageOfOrigin: 'Sanskrit',
  rightsHolder: 'Editorial Team',
  shortDefinition: 'Duty.',
  shortDescription: 'The order that upholds.',
  slug: 'dharma',
  termIast: 'dharma',
  title: 'Dharma',
};

function term(overrides: Partial<GlossaryTermRow> = {}): GlossaryTermRow {
  return {
    archivedAt: null,
    audioTracks: null,
    banner: 'banner.jpg',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    devanagari: 'धर्म',
    extendedDefinition: null,
    faqItems: null,
    id: 'term-1',
    imageGallery: null,
    languageOfOrigin: 'Sanskrit',
    localeStates: null,
    partOfSpeech: null,
    printablePdfs: null,
    published: false,
    publishedAt: null,
    publishedBy: null,
    regionalEquivalents: null,
    returnedAt: null,
    returnedBy: null,
    returnReason: null,
    rightsHolder: 'Editorial Team',
    shortDefinition: 'Duty.',
    shortDescription: 'The order that upholds.',
    slug: 'dharma',
    submittedAt: null,
    submittedBy: null,
    summary: null,
    termIast: 'dharma',
    tierVisibility: 'FREE',
    title: 'Dharma',
    traditionMeanings: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    videoItems: null,
    vocabularyRequired: false,
    workflowState: 'DRAFT',
    ...overrides,
  };
}

const EDITOR: AuthPrincipal = {
  capabilities: ['content.create', 'content.update', 'media.upload'],
  email: 'ed@example.test',
  id: 'user-editor',
  roles: ['editor'],
};
const REVIEWER: AuthPrincipal = {
  capabilities: [
    'content.publish',
    'content.review',
    'media.upload',
    'seo.manage',
  ],
  email: 'rev@example.test',
  id: 'user-reviewer',
  roles: ['reviewer'],
};
const REVIEWER2: AuthPrincipal = {
  capabilities: [
    'content.publish',
    'content.review',
    'media.upload',
    'seo.manage',
  ],
  email: 'rev2@example.test',
  id: 'user-reviewer-2',
  roles: ['reviewer'],
};
const ADMIN: AuthPrincipal = {
  capabilities: ['content.delete', 'audit.view'],
  email: 'admin@example.test',
  id: 'user-admin',
  roles: ['admin'],
};
const SUPER: AuthPrincipal = {
  capabilities: ['content.create', 'content.update', 'content.publish', 'content.review'],
  email: 'root@example.test',
  id: 'user-root',
  roles: ['super_admin'],
};

function userRow(
  principal: AuthPrincipal,
): StaffUserRow {
  return {
    createdAt: new Date(),
    email: principal.email,
    failedAttempts: 0,
    id: principal.id,
    lockedUntil: null,
    passwordHash: 'hash',
    roles: principal.roles,
    updatedAt: new Date(),
  };
}

interface Harness {
  assignments: AssignmentRow[];
  auditEvents: AuditEventRow[];
  repo: StaffGlossaryRepository;
  roster: RosterRow[];
  service: WorkflowService;
  terms: GlossaryTermRow[];
  users: Map<string, StaffUserRow>;
  versions: VersionRow[];
}

function makeService(configOverrides: Partial<WorkflowConfig> = {}): Harness {
  const terms: GlossaryTermRow[] = [];
  const versions: VersionRow[] = [];
  const assignments: AssignmentRow[] = [];
  const roster: RosterRow[] = [];
  const users = new Map<string, StaffUserRow>();
  for (const principal of [EDITOR, REVIEWER, REVIEWER2, ADMIN, SUPER]) {
    users.set(principal.id, userRow(principal));
  }
  let termCounter = 1;
  let versionCounter = 1;
  let assignmentCounter = 1;
  const repo: StaffGlossaryRepository = {
    createAssignment: jest.fn().mockImplementation((data) => {
      const row: AssignmentRow = {
        ...data,
        createdAt: new Date(),
        id: `asg-${assignmentCounter++}`,
        updatedAt: new Date(),
      };
      assignments.push(row);
      return Promise.resolve(row);
    }),
    createTerm: jest.fn().mockImplementation((data) => {
      const row: GlossaryTermRow = {
        ...term({ id: `term-${termCounter++}` }),
        ...data,
      } as GlossaryTermRow;
      terms.push(row);
      return Promise.resolve(row);
    }),
    createVersion: jest.fn().mockImplementation((data) => {
      const row: VersionRow = {
        ...data,
        createdAt: new Date(),
        id: `ver-${versionCounter++}`,
      };
      versions.push(row);
      return Promise.resolve(row);
    }),
    findByIdStaff: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(terms.find((t) => t.id === id) ?? null),
      ),
    findBySlugStaff: jest
      .fn()
      .mockImplementation((slug: string) =>
        Promise.resolve(terms.find((t) => t.slug === slug) ?? null),
      ),
    latestVersion: jest.fn().mockImplementation((documentId: string) => {
      const rows = versions
        .filter((v) => v.documentId === documentId)
        .sort(
          (a, b) =>
            b.major - a.major || b.minor - a.minor ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return Promise.resolve(rows[0] ?? null);
    }),
    listAssignments: jest
      .fn()
      .mockImplementation((documentId: string) =>
        Promise.resolve(
          assignments.filter((a) => a.documentId === documentId),
        ),
      ),
    listStaff: jest.fn().mockImplementation(() => Promise.resolve([...terms])),
    listVersions: jest
      .fn()
      .mockImplementation((documentId: string) =>
        Promise.resolve(
          versions
            .filter((v) => v.documentId === documentId)
            .sort((a, b) => b.major - a.major || b.minor - a.minor),
        ),
      ),
    rosterMembers: jest
      .fn()
      .mockImplementation((name: string) =>
        Promise.resolve(roster.filter((r) => r.roster === name)),
      ),
    updateAssignment: jest
      .fn()
      .mockImplementation((id: string, data: Partial<AssignmentRow>) => {
        const row = assignments.find((a) => a.id === id);
        if (!row) {
          throw new NotFoundError('assignment');
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return Promise.resolve(row);
      }),
    updateTerm: jest
      .fn()
      .mockImplementation((id: string, data: Partial<GlossaryTermRow>) => {
        const row = terms.find((t) => t.id === id);
        if (!row) {
          throw new NotFoundError('term');
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return Promise.resolve(row);
      }),
    updateVersionSnapshot: jest
      .fn()
      .mockImplementation((id: string, snapshot: Record<string, unknown>) => {
        const row = versions.find((v) => v.id === id);
        if (!row) {
          throw new NotFoundError('version');
        }
        row.snapshot = snapshot;
        return Promise.resolve(row);
      }),
  };
  const userRepo: UserRepository = {
    findByEmail: jest
      .fn()
      .mockImplementation((email: string) =>
        Promise.resolve(
          [...users.values()].find((u) => u.email === email) ?? null,
        ),
      ),
    findById: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(users.get(id) ?? null),
      ),
    save: jest.fn().mockImplementation((user: StaffUserRow) => {
      users.set(user.id, user);
      return Promise.resolve(user);
    }),
  };
  const auditEvents: AuditEventRow[] = [];
  const auditRepo: AuditRepository = {
    append: jest.fn().mockImplementation((event: AuditEventInput) => {
      const row: AuditEventRow = {
        ...event,
        createdAt: new Date(),
        id: `evt-${auditEvents.length + 1}`,
      };
      auditEvents.push(row);
      return Promise.resolve(row);
    }),
    lastHash: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          auditEvents.length > 0
            ? auditEvents[auditEvents.length - 1].hash
            : null,
        ),
      ),
    list: jest.fn().mockResolvedValue([]),
  };
  const audit = new AuditService(auditRepo);
  const config: WorkflowConfig = {
    autoPublishOnApprove: false,
    autoReassignHours: 72,
    coalesceMinutes: 5,
    requireReviewer: true,
    reviewSlaHours: 72,
    ...configOverrides,
  };
  const service = new WorkflowService(repo, userRepo, audit, config);
  return {
    assignments,
    auditEvents,
    repo,
    roster,
    service,
    terms,
    users,
    versions,
  };
}

/** Assert a ValidationError whose details[] contain the substring. */
async function expectValidation(
  promise: Promise<unknown>,
  substring: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details.join(' ')).toContain(substring);
    return;
  }
  throw new Error(`Expected ValidationError containing: ${substring}`);
}

describe('WorkflowService', () => {
  it('creates a Draft at v1.0 with a created audit event', async () => {
    const h = makeService();
    const row = await h.service.createDraft(EDITOR, VALID_INPUT);
    expect(row.workflowState).toBe('DRAFT');
    expect(row.published).toBe(false);
    expect(h.versions).toHaveLength(1);
    expect(h.versions[0].version).toBe('v1.0');
    expect(h.versions[0].transition).toBe('created');
    expect(
      h.auditEvents.some(
        (e) => e.action === 'created' && e.targetId === row.id,
      ),
    ).toBe(true);
  });

  it('reports every validation error at once, and rejects slug clashes', async () => {
    const h = makeService();
    await expect(
      h.service.createDraft(EDITOR, {
        slug: 'Bad Slug!',
        title: '',
      }),
    ).rejects.toThrow(ValidationError);
    try {
      await h.service.createDraft(EDITOR, { slug: 'Bad Slug!' });
    } catch (error) {
      const details = (error as ValidationError).details;
      expect(details.length).toBeGreaterThan(3);
      expect(details).toContain(
        'Slug is required: lowercase letters, numbers, hyphens only.',
      );
    }
    await h.service.createDraft(EDITOR, VALID_INPUT);
    await expectValidation(
      h.service.createDraft(EDITOR, VALID_INPUT),
      'Slug is already in use.',
    );
  });

  it('coalesces consecutive autosaves but always versions explicit saves', async () => {
    const h = makeService();
    const row = await h.service.createDraft(EDITOR, VALID_INPUT);
    await h.service.updateDraft(
      EDITOR,
      'dharma',
      { title: 'Dharma One' },
      { autosave: true },
    );
    await h.service.updateDraft(
      EDITOR,
      'dharma',
      { title: 'Dharma Two' },
      { autosave: true },
    );
    expect(
      h.versions.filter((v) => v.documentId === row.id),
    ).toHaveLength(2); // v1.0 + one coalesced autosave version
    const latest = await h.repo.latestVersion(row.id);
    expect(
      (latest?.snapshot as { title?: string }).title,
    ).toBe('Dharma Two');
    await h.service.updateDraft(EDITOR, 'dharma', { title: 'Dharma Three' }, { autosave: false });
    expect(
      h.versions.filter((v) => v.documentId === row.id),
    ).toHaveLength(3);
  });

  it('refuses edits outside Draft', async () => {
    const h = makeService();
    const row = await h.service.createDraft(EDITOR, VALID_INPUT);
    h.terms[0].workflowState = 'REVIEW';
    await expect(
      h.service.updateDraft(EDITOR, 'dharma', { title: 'X' }, { autosave: false }),
    ).rejects.toThrow(ConflictError);
    void row;
  });

  it('submit with an empty roster takes the pool-empty path', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const result = await h.service.submit(EDITOR, 'dharma', {});
    expect(result.term.workflowState).toBe('REVIEW');
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].poolEmpty).toBe(true);
    expect(result.assignments[0].reviewerId).toBeNull();
    expect(result.assignments[0].dueAt).not.toBeNull();
  });

  it('submit requires a reviewer when the roster is populated', async () => {
    const h = makeService();
    h.roster.push({
      createdAt: new Date(),
      id: 'ros-1',
      roster: 'glossary_approver',
      userId: 'user-reviewer',
    });
    await h.service.createDraft(EDITOR, VALID_INPUT);
    await expectValidation(
      h.service.submit(EDITOR, 'dharma', {}),
      'SYS32_REVIEWER_REQUIRED',
    );
    const result = await h.service.submit(EDITOR, 'dharma', {
      reviewerId: 'user-reviewer',
    });
    expect(result.assignments[0].reviewerId).toBe('user-reviewer');
    expect(result.assignments[0].poolEmpty).toBe(false);
  });

  it('submit rejects reviewers without the capability or off-roster', async () => {
    const h = makeService();
    h.roster.push({
      createdAt: new Date(),
      id: 'ros-1',
      roster: 'glossary_approver',
      userId: 'user-reviewer',
    });
    await h.service.createDraft(EDITOR, VALID_INPUT);
    await expectValidation(
      h.service.submit(EDITOR, 'dharma', { reviewerId: 'user-editor' }),
      'content.review',
    );
    await expectValidation(
      h.service.submit(EDITOR, 'dharma', { reviewerId: 'user-reviewer-2' }),
      'not on the Glossary Approver roster',
    );
    await expectValidation(
      h.service.submit(EDITOR, 'dharma', { reviewerId: 'user-ghost' }),
      'Reviewer not found.',
    );
  });

  it('runs the full happy path: submit → approve → publish at v2.0', async () => {
    const h = makeService();
    h.roster.push({
      createdAt: new Date(),
      id: 'ros-1',
      roster: 'glossary_approver',
      userId: 'user-reviewer',
    });
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {
      reviewerId: 'user-reviewer',
    });
    const assignmentId = submitted.assignments[0].id;
    const outcome = await h.service.setOutcome(REVIEWER, 'dharma', assignmentId, {
      outcome: 'approved',
    });
    expect(outcome.assignment.outcome).toBe('approved');
    expect(outcome.term.workflowState).toBe('REVIEW');
    const approved = await h.service.approve(REVIEWER, 'dharma', {
      changeSummary: 'Reviewed, looks right.',
    });
    expect(approved.term.workflowState).toBe('APPROVE');
    expect(approved.autoPublished).toBe(false);
    const published = await h.service.publish(SUPER, 'dharma', {
      changeSummary: 'Publishing.',
    });
    expect(published.term.workflowState).toBe('PUBLISHED');
    expect(published.term.published).toBe(true);
    expect(published.version).toBe('v2.0');
    expect(published.gates).toContainEqual({
      gate: 'seo_markup_valid',
      status: 'skipped (deferred)',
    });
    expect(
      h.auditEvents.some(
        (e) => e.action === 'published' && e.targetId === published.term.id,
      ),
    ).toBe(true);
  });

  it('approve requires a change summary and fully-approved reviews', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {});
    await expectValidation(
      h.service.approve(REVIEWER, 'dharma', {}),
      'changeSummary is required',
    );
    await expectValidation(
      h.service.approve(REVIEWER, 'dharma', { changeSummary: 'ok' }),
      'reviews_incomplete',
    );
    void submitted;
  });

  it('two-key publish: Reviewer and Admin both fail, Super Admin passes', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {});
    await h.service.setOutcome(REVIEWER, 'dharma', submitted.assignments[0].id, {
      outcome: 'approved',
    });
    await h.service.approve(REVIEWER, 'dharma', { changeSummary: 'ok' });
    await expect(
      h.service.publish(REVIEWER, 'dharma', { changeSummary: 'go' }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      h.service.publish(ADMIN, 'dharma', { changeSummary: 'go' }),
    ).rejects.toThrow(ForbiddenError);
    const published = await h.service.publish(SUPER, 'dharma', {
      changeSummary: 'go',
    });
    expect(published.term.workflowState).toBe('PUBLISHED');
    expect(
      h.auditEvents.some(
        (e) =>
          e.action === 'permission_change' &&
          (e.payload as { denied?: boolean } | null)?.denied === true,
      ),
    ).toBe(true);
  });

  it('publish gates fail on missing mandatory fields', async () => {
    const h = makeService();
    // Create a term missing banner/rightsHolder via the repo directly
    // (createDraft would reject it) to reach the gate.
    const row = await h.repo.createTerm({
      ...term({ workflowState: 'APPROVE' }),
      banner: '',
      rightsHolder: '',
    });
    await h.repo.createAssignment({
      annotations: null,
      documentId: row.id,
      dueAt: new Date(),
      escalated: false,
      notes: null,
      outcome: 'approved',
      outcomeHistory: null,
      poolEmpty: false,
      reviewerId: 'user-reviewer',
      reviewType: 'specialist',
      roster: 'glossary_approver',
    });
    await expect(
      h.service.publish(SUPER, 'dharma', { changeSummary: 'go' }),
    ).rejects.toThrow(ValidationError);
  });

  it('return requires notes, resets assignments, and records history', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {});
    const id = submitted.assignments[0].id;
    await expectValidation(
      h.service.setOutcome(REVIEWER, 'dharma', id, { outcome: 'returned' }),
      'mandatory',
    );
    const result = await h.service.setOutcome(REVIEWER, 'dharma', id, {
      notes: 'Fix the IAST.',
      outcome: 'returned',
    });
    expect(result.term.workflowState).toBe('DRAFT');
    expect(result.term.returnReason).toBe('Fix the IAST.');
    const assignments = await h.service.listAssignments('dharma');
    expect(assignments[0].outcome).toBe('pending');
    expect(assignments[0].outcomeHistory?.length).toBe(1);
  });

  it('approved-with-edits records annotations and returns to Draft', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {});
    const id = submitted.assignments[0].id;
    const result = await h.service.setOutcome(REVIEWER, 'dharma', id, {
      annotations: { shortDefinition: 'Tighten this line.' },
      notes: 'Two small fixes.',
      outcome: 'approved_with_edits',
    });
    expect(result.term.workflowState).toBe('DRAFT');
    expect(result.assignment.outcome).toBe('approved_with_edits');
    expect(
      (result.assignment.annotations as { shortDefinition?: string })
        ?.shortDefinition,
    ).toBe('Tighten this line.');
  });

  it('break-glass is Super Admin only, needs a reason, and only moves forward', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    await expect(
      h.service.breakGlass(ADMIN, 'dharma', { reason: 'emergency', to: 'published' }),
    ).rejects.toThrow(ForbiddenError);
    await expectValidation(
      h.service.breakGlass(SUPER, 'dharma', { to: 'published' }),
      'mandatory',
    );
    await expect(
      h.service.breakGlass(SUPER, 'dharma', { reason: 'x', to: 'draft' }),
    ).rejects.toThrow(ConflictError);
    const forced = await h.service.breakGlass(SUPER, 'dharma', {
      reason: 'Festival deadline.',
      to: 'published',
    });
    expect(forced.workflowState).toBe('PUBLISHED');
    expect(forced.published).toBe(true);
    const event = h.auditEvents.find(
      (e) =>
        e.action === 'updated' &&
        (e.payload as { breakGlass?: boolean } | null)?.breakGlass === true,
    );
    expect(event).toBeDefined();
    expect(
      (event?.payload as { skipped?: string[] } | null)?.skipped,
    ).toEqual(['review', 'approve']);
  });

  it('unpublish returns to Draft and archive excludes from the staff list', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {});
    await h.service.setOutcome(REVIEWER, 'dharma', submitted.assignments[0].id, {
      outcome: 'approved',
    });
    await h.service.approve(REVIEWER, 'dharma', { changeSummary: 'ok' });
    await h.service.publish(SUPER, 'dharma', { changeSummary: 'go' });
    const unpublished = await h.service.unpublish(SUPER, 'dharma', {
      handling: 'archive',
    });
    expect(unpublished.workflowState).toBe('DRAFT');
    expect(unpublished.published).toBe(false);
    expect(unpublished.archivedAt).not.toBeNull();
    expect(await h.service.listStaffTerms()).toHaveLength(0);
  });

  it('reassign moves pending assignments; overdue sweep round-robins or escalates', async () => {
    const h = makeService();
    h.roster.push(
      {
        createdAt: new Date(),
        id: 'ros-1',
        roster: 'glossary_approver',
        userId: 'user-reviewer',
      },
      {
        createdAt: new Date(),
        id: 'ros-2',
        roster: 'glossary_approver',
        userId: 'user-reviewer-2',
      },
    );
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const submitted = await h.service.submit(EDITOR, 'dharma', {
      reviewerId: 'user-reviewer',
    });
    const id = submitted.assignments[0].id;
    const reassigned = await h.service.reassign(REVIEWER, 'dharma', id, {
      reviewerId: 'user-reviewer-2',
    });
    expect(reassigned.reviewerId).toBe('user-reviewer-2');
    // Force the assignment overdue: due 100h ago, breach threshold 72h.
    const assignment = h.assignments.find((a) => a.id === id);
    if (assignment) {
      assignment.dueAt = new Date(Date.now() - 100 * 3_600_000);
    }
    const sweep = await h.service.reassignOverdue(SUPER, new Date());
    expect(sweep.reassigned).toBe(1);
    expect(
      h.assignments.find((a) => a.id === id)?.reviewerId,
    ).toBe('user-reviewer');
    // With only one roster member, an overdue assignment escalates.
    const h2 = makeService();
    h2.roster.push({
      createdAt: new Date(),
      id: 'ros-1',
      roster: 'glossary_approver',
      userId: 'user-reviewer',
    });
    await h2.service.createDraft(EDITOR, VALID_INPUT);
    const submitted2 = await h2.service.submit(EDITOR, 'dharma', {
      reviewerId: 'user-reviewer',
    });
    const a2 = h2.assignments.find(
      (a) => a.id === submitted2.assignments[0].id,
    );
    if (a2) {
      a2.dueAt = new Date(Date.now() - 100 * 3_600_000);
    }
    const sweep2 = await h2.service.reassignOverdue(SUPER, new Date());
    expect(sweep2).toEqual({ escalated: 1, reassigned: 0 });
    // autoReassignHours = 0 disables the sweep entirely.
    const h3 = makeService({ autoReassignHours: 0 });
    await h3.service.createDraft(EDITOR, VALID_INPUT);
    const sweep3 = await h3.service.reassignOverdue(SUPER, new Date());
    expect(sweep3).toEqual({ escalated: 0, reassigned: 0 });
  });

  it('translator locale edits touch only the overlay, Draft only', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    const updated = await h.service.updateLocale(EDITOR, 'dharma', {
      hi: 'draft',
    });
    expect(updated.localeStates).toEqual({ hi: 'draft' });
    expect(updated.title).toBe('Dharma');
    await expect(
      h.service.updateLocale(EDITOR, 'dharma', { hi: 'bogus-state' }),
    ).rejects.toThrow(ValidationError);
  });

  it('reviewer picker returns only roster members', async () => {
    const h = makeService();
    h.roster.push({
      createdAt: new Date(),
      id: 'ros-1',
      roster: 'glossary_approver',
      userId: 'user-reviewer',
    });
    const reviewers = await h.service.listReviewers();
    expect(reviewers.map((r) => r.id)).toEqual(['user-reviewer']);
    const empty = makeService();
    expect(await empty.service.listReviewers()).toEqual([]);
  });

  it('versions accumulate append-only labels across the lifecycle', async () => {
    const h = makeService();
    await h.service.createDraft(EDITOR, VALID_INPUT);
    await h.service.updateDraft(EDITOR, 'dharma', { title: 'Dharma 2' }, { autosave: false });
    const submitted = await h.service.submit(EDITOR, 'dharma', {});
    await h.service.setOutcome(REVIEWER, 'dharma', submitted.assignments[0].id, {
      outcome: 'approved',
    });
    await h.service.approve(REVIEWER, 'dharma', { changeSummary: 'ok' });
    await h.service.publish(SUPER, 'dharma', { changeSummary: 'go' });
    const versions = await h.service.listVersions('dharma');
    expect(versions.map((v) => v.version)).toEqual([
      'v2.0',
      'v1.3',
      'v1.2',
      'v1.1',
      'v1.0',
    ]);
  });
});

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { listEnvelope, singleEnvelope } from '../common/envelope';
import { ForbiddenError } from '../common/errors';
import {
  AuthPrincipal,
  CapabilitiesGuard,
  JwtAuthGuard,
  RequireAnyCapability,
  RequireCapabilities,
  getPrincipal,
} from '../auth/auth.guard';
import { toStaff } from './glossary.types';
import { GlossaryInput } from './validation';
import { WorkflowService } from './workflow.service';

/**
 * Staff glossary endpoints (G01 only). Every route requires a staff
 * session; mutations additionally require the named capability (the
 * S01 matrix governs — see workflow.service.ts for the S32 §4
 * divergences this enforces). Staff reads are open to any
 * authenticated staff user (S32 §4 board visibility: all seven roles
 * read-only) — the public gate does not apply here, but nothing on
 * these routes is public: no session → 401.
 */
@Controller('staff/glossary')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
export class StaffGlossaryController {
  constructor(private readonly workflow: WorkflowService) {}

  @Post()
  @RequireCapabilities('content.create')
  async create(
    @Req() req: { user?: AuthPrincipal },
    @Body() body: GlossaryInput,
  ) {
    const term = await this.workflow.createDraft(getPrincipal(req), body);
    return singleEnvelope(toStaff(term));
  }

  @Get()
  async list(@Req() req: { user?: AuthPrincipal }) {
    getPrincipal(req);
    const terms = await this.workflow.listStaffTerms();
    return listEnvelope(terms.map(toStaff), {
      cursor: null,
      hasMore: false,
      limit: terms.length,
      nextCursor: null,
      total: terms.length,
    });
  }

  @Get('reviewers')
  @RequireCapabilities('content.review')
  async reviewers() {
    const reviewers = await this.workflow.listReviewers();
    return listEnvelope(reviewers, {
      cursor: null,
      hasMore: false,
      limit: reviewers.length,
      nextCursor: null,
      total: reviewers.length,
    });
  }

  @Post('reassign-overdue')
  @RequireCapabilities('content.review')
  async reassignOverdue(@Req() req: { user?: AuthPrincipal }) {
    const result = await this.workflow.reassignOverdue(
      getPrincipal(req),
      new Date(),
    );
    return singleEnvelope(result);
  }

  @Get(':slug')
  async detail(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
  ) {
    getPrincipal(req);
    const term = await this.workflow.loadStaffTerm(slug);
    return singleEnvelope(toStaff(term));
  }

  @Patch(':slug')
  @RequireAnyCapability('content.update', 'content.translate')
  async update(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Body() body: GlossaryInput & { autosave?: boolean },
  ) {
    const principal = getPrincipal(req);
    const { autosave, ...rest } = body;
    if (
      !principal.capabilities.includes('content.update') &&
      principal.capabilities.includes('content.translate')
    ) {
      // Translator path: locale overlay only (S32 §4 note 1).
      const localeStates = rest.localeStates;
      if (
        localeStates === undefined ||
        typeof localeStates !== 'object' ||
        localeStates === null ||
        Array.isArray(localeStates) ||
        Object.keys(rest).some((key) => key !== 'localeStates')
      ) {
        throw new ForbiddenError('Translators may edit locale fields only.');
      }
      const term = await this.workflow.updateLocale(
        principal,
        slug,
        localeStates as Record<string, string>,
      );
      return singleEnvelope(toStaff(term));
    }
    const term = await this.workflow.updateDraft(
      principal,
      slug,
      rest,
      { autosave: autosave === true },
    );
    return singleEnvelope(toStaff(term));
  }

  @Post(':slug/submit')
  @RequireAnyCapability('content.create', 'content.update')
  async submit(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Body() body: { note?: string; reviewerId?: string },
  ) {
    const result = await this.workflow.submit(getPrincipal(req), slug, body);
    return singleEnvelope({
      assignments: result.assignments.map((item) => ({
        dueAt: item.dueAt ? item.dueAt.toISOString() : null,
        id: item.id,
        outcome: item.outcome,
        poolEmpty: item.poolEmpty,
        reviewerId: item.reviewerId,
      })),
      term: toStaff(result.term),
      version: result.version,
    });
  }

  @Post(':slug/assignments/:id/outcome')
  @RequireCapabilities('content.review')
  async setOutcome(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body()
    body: {
      annotations?: Record<string, unknown>;
      notes?: string;
      outcome: 'approved' | 'approved_with_edits' | 'returned';
    },
  ) {
    const result = await this.workflow.setOutcome(
      getPrincipal(req),
      slug,
      id,
      body,
    );
    return singleEnvelope({
      assignment: {
        id: result.assignment.id,
        outcome: result.assignment.outcome,
      },
      term: toStaff(result.term),
    });
  }

  @Post(':slug/approve')
  @RequireCapabilities('content.review')
  async approve(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Body() body: { changeSummary?: string },
  ) {
    const result = await this.workflow.approve(getPrincipal(req), slug, body);
    return singleEnvelope({
      autoPublished: result.autoPublished,
      term: toStaff(result.term),
      version: result.version,
    });
  }

  @Post(':slug/publish')
  @RequireCapabilities('content.publish')
  async publish(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Body() body: { changeSummary?: string },
  ) {
    const result = await this.workflow.publish(getPrincipal(req), slug, body);
    return singleEnvelope({
      gates: result.gates,
      term: toStaff(result.term),
      version: result.version,
    });
  }

  @Post(':slug/unpublish')
  @RequireCapabilities('content.publish')
  async unpublish(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Body() body: { handling?: 'archive' | 'soft' },
  ) {
    const term = await this.workflow.unpublish(getPrincipal(req), slug, body);
    return singleEnvelope(toStaff(term));
  }

  @Post(':slug/break-glass')
  async breakGlass(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Body() body: { reason?: string; to?: string },
  ) {
    // No capability decorator: break-glass is a Super Admin
    // role-membership check inside the service (narrowed rule).
    const term = await this.workflow.breakGlass(getPrincipal(req), slug, body);
    return singleEnvelope(toStaff(term));
  }

  @Post(':slug/assignments/:id/reassign')
  @RequireCapabilities('content.review')
  async reassign(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() body: { reviewerId: string },
  ) {
    const assignment = await this.workflow.reassign(
      getPrincipal(req),
      slug,
      id,
      body,
    );
    return singleEnvelope({
      dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
      escalated: assignment.escalated,
      id: assignment.id,
      outcome: assignment.outcome,
      reviewerId: assignment.reviewerId,
    });
  }

  @Get(':slug/versions')
  async versions(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
  ) {
    getPrincipal(req);
    const versions = await this.workflow.listVersions(slug);
    return listEnvelope(
      versions.map((item) => ({
        actorId: item.actorId,
        changeSummary: item.changeSummary,
        createdAt: item.createdAt.toISOString(),
        restoredFrom: item.restoredFrom,
        transition: item.transition,
        version: item.version,
      })),
      {
        cursor: null,
        hasMore: false,
        limit: versions.length,
        nextCursor: null,
        total: versions.length,
      },
    );
  }

  @Get(':slug/assignments')
  async assignments(
    @Req() req: { user?: AuthPrincipal },
    @Param('slug') slug: string,
  ) {
    getPrincipal(req);
    const assignments = await this.workflow.listAssignments(slug);
    return listEnvelope(
      assignments.map((item) => ({
        dueAt: item.dueAt ? item.dueAt.toISOString() : null,
        escalated: item.escalated,
        id: item.id,
        notes: item.notes,
        outcome: item.outcome,
        poolEmpty: item.poolEmpty,
        reviewerId: item.reviewerId,
        reviewType: item.reviewType,
        roster: item.roster,
      })),
      {
        cursor: null,
        hasMore: false,
        limit: assignments.length,
        nextCursor: null,
        total: assignments.length,
      },
    );
  }
}

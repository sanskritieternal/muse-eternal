import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AuditService } from '../audit/audit.service';
import { AuditEventInput, AuditEventRow, AuditRepository } from '../audit/audit.repository';
import { ProblemFilter } from '../common/filters/problem.filter';
import { capabilitiesForRoles } from '../auth/capabilities';
import { AuthService } from '../auth/auth.service';
import {
  CapabilitiesGuard,
  JwtAuthGuard,
} from '../auth/auth.guard';
import { StaffGlossaryController } from './staff.controller';
import { WorkflowService } from './workflow.service';

const SECRET = 'controller-spec-secret';

function tokenFor(roles: string[]): string {
  return jwt.sign(
    {
      capabilities: capabilitiesForRoles(roles),
      email: `${roles[0]}@example.test`,
      roles,
      sub: `user-${roles[0]}`,
    },
    SECRET,
    { expiresIn: '15m' },
  );
}

const EDITOR_TOKEN = tokenFor(['editor']);
const REVIEWER_TOKEN = tokenFor(['reviewer']);
const ADMIN_TOKEN = tokenFor(['admin']);
const SUPER_TOKEN = tokenFor(['super_admin']);

/**
 * Guard-wiring tests: real JwtAuthGuard + CapabilitiesGuard against a
 * stubbed WorkflowService. Service-level permission logic (two-key,
 * matrix-governs) is covered in workflow.service.spec.ts; these tests
 * prove the HTTP layer enforces authentication and capabilities.
 */
describe('StaffGlossaryController guards', () => {
  let app: INestApplication;
  const workflowStub = {
    breakGlass: jest.fn(),
    createDraft: jest.fn(),
    loadStaffTerm: jest.fn(),
    publish: jest.fn(),
  };

  beforeAll(async () => {
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
      lastHash: jest.fn().mockResolvedValue(null),
      list: jest.fn().mockResolvedValue([]),
    };
    const audit = new AuditService(auditRepo);
    const auth = new AuthService(
      {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
      },
      {
        findByHash: jest.fn(),
        revokeFamily: jest.fn(),
        save: jest.fn(),
      },
      audit,
      {
        accessTtlMinutes: 15,
        jwtSecret: SECRET,
        lockoutAttempts: 5,
        lockoutMinutes: 15,
        sessionTimeoutMinutes: 60,
      },
    );
    // Provide the guards' dependencies and let Nest construct the
    // guards, so the real @UseGuards wiring on the controller is used.
    const moduleRef = await Test.createTestingModule({
      controllers: [StaffGlossaryController],
      providers: [
        { provide: WorkflowService, useValue: workflowStub },
        { provide: AuthService, useValue: auth },
        { provide: AuditService, useValue: audit },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401s staff routes without a session', async () => {
    await request(app.getHttpServer())
      .post('/staff/glossary')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .get('/staff/glossary/dharma')
      .expect(401);
    await request(app.getHttpServer())
      .post('/staff/glossary/dharma/publish')
      .send({})
      .expect(401);
  });

  it('401s on a malformed or foreign token', async () => {
    await request(app.getHttpServer())
      .get('/staff/glossary/dharma')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
    const foreign = jwt.sign(
      { sub: 'x', roles: ['editor'], capabilities: [] },
      'a-different-secret',
      { expiresIn: '15m' },
    );
    await request(app.getHttpServer())
      .get('/staff/glossary/dharma')
      .set('Authorization', `Bearer ${foreign}`)
      .expect(401);
  });

  it('403s Admin create: the S01 matrix denies Admin content.create (matrix governs over S32 §4)', async () => {
    await request(app.getHttpServer())
      .post('/staff/glossary')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({})
      .expect(403);
    expect(workflowStub.createDraft).not.toHaveBeenCalled();
  });

  it('lets Editor create through to the service', async () => {
    workflowStub.createDraft.mockResolvedValue({
      archivedAt: null,
      audioTracks: null,
      banner: 'b.jpg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      devanagari: 'धर्म',
      extendedDefinition: null,
      faqItems: null,
      id: 't1',
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
      rightsHolder: 'Team',
      shortDefinition: 'Duty.',
      shortDescription: 'Order.',
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
    });
    const res = await request(app.getHttpServer())
      .post('/staff/glossary')
      .set('Authorization', `Bearer ${EDITOR_TOKEN}`)
      .send({ slug: 'dharma' })
      .expect(201);
    expect(res.body.data.slug).toBe('dharma');
    expect(workflowStub.createDraft).toHaveBeenCalled();
  });

  it('lets Reviewer reach publish (guard passes on capability; the service enforces two-key)', async () => {
    // The guard passes: Reviewer holds content.publish. The service
    // is stubbed here, so the call reaches it — the two-key denial
    // itself is proven in workflow.service.spec.ts.
    workflowStub.publish.mockResolvedValue({
      gates: [],
      term: {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        slug: 'dharma',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        workflowState: 'PUBLISHED',
      },
      version: 'v2.0',
    });
    await request(app.getHttpServer())
      .post('/staff/glossary/dharma/publish')
      .set('Authorization', `Bearer ${REVIEWER_TOKEN}`)
      .send({ changeSummary: 'go' })
      .expect(201);
    expect(workflowStub.publish).toHaveBeenCalled();
  });

  it('403s Editor publish at the guard (no content.publish)', async () => {
    await request(app.getHttpServer())
      .post('/staff/glossary/dharma/publish')
      .set('Authorization', `Bearer ${EDITOR_TOKEN}`)
      .send({ changeSummary: 'go' })
      .expect(403);
  });

  it('lets Super Admin break-glass through to the service (role check is in the service)', async () => {
    workflowStub.breakGlass.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      slug: 'dharma',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      workflowState: 'PUBLISHED',
    });
    await request(app.getHttpServer())
      .post('/staff/glossary/dharma/break-glass')
      .set('Authorization', `Bearer ${SUPER_TOKEN}`)
      .send({ reason: 'emergency', to: 'published' })
      .expect(201);
    expect(workflowStub.breakGlass).toHaveBeenCalled();
  });
});

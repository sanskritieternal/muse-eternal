import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { ProblemFilter } from '../common/filters/problem.filter';
import { DatabaseUnavailableError } from '../common/errors';
import { GLOSSARY_REPOSITORY, GlossaryRepository } from './glossary.repository';
import { GlossaryTermRow } from './glossary.types';

function row(overrides: Partial<GlossaryTermRow>): GlossaryTermRow {
  return {
    banner: 'banner.jpg',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    devanagari: 'धर्म',
    id: 'id-dharma',
    languageOfOrigin: 'Sanskrit',
    published: true,
    rightsHolder: 'Sanatan Dharma Editorial Team',
    shortDefinition: 'Duty.',
    shortDescription: 'The order that upholds.',
    slug: 'dharma',
    summary: null,
    termIast: 'dharma',
    tierVisibility: 'FREE',
    title: 'Dharma',
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    vocabularyRequired: false,
    ...overrides,
  };
}

const ROWS: GlossaryTermRow[] = [
  row({ id: 'id-dharma', slug: 'dharma', termIast: 'dharma' }),
  row({ id: 'id-ahimsa', slug: 'ahimsa', termIast: 'ahiṃsā', devanagari: 'अहिंसा' }),
  row({ id: 'id-karma', slug: 'karma', termIast: 'karma', published: false }),
  row({ id: 'id-moksha', slug: 'moksha', termIast: 'mokṣa', tierVisibility: 'SEVA' }),
];

function mockRepository(): GlossaryRepository {
  return {
    findAll: jest.fn().mockResolvedValue(ROWS),
    findBySlug: jest
      .fn()
      .mockImplementation((slug: string) =>
        Promise.resolve(ROWS.find((r) => r.slug === slug) ?? null),
      ),
  };
}

async function buildApp(
  repository: GlossaryRepository,
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GLOSSARY_REPOSITORY)
    .useValue(repository)
    .compile();
  const app = moduleFixture.createNestApplication();
  app.useGlobalFilters(new ProblemFilter());
  await app.init();
  return app;
}

describe('HTTP: health', () => {
  it('GET /health returns 200 with no DB dependency', async () => {
    const app = await buildApp(mockRepository());
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.data).toEqual({ status: 'ok' });
    expect(res.body.meta).toEqual({ total: 1 });
    await app.close();
  });
});

describe('HTTP: glossary list', () => {
  it('returns the envelope with visible rows only', async () => {
    const app = await buildApp(mockRepository());
    const res = await request(app.getHttpServer())
      .get('/glossary')
      .expect(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.map((r: { slug: string }) => r.slug)).toEqual([
      'ahimsa',
      'dharma',
    ]);
    expect(res.body.meta.limit).toBe(20);
    expect(res.body.meta.hasMore).toBe(false);
    await app.close();
  });

  it('applies the letter filter', async () => {
    const app = await buildApp(mockRepository());
    const res = await request(app.getHttpServer())
      .get('/glossary?letter=A')
      .expect(200);
    expect(res.body.data.map((r: { slug: string }) => r.slug)).toEqual([
      'ahimsa',
    ]);
    await app.close();
  });

  it('rejects a bad letter with an RFC 9457 400', async () => {
    const app = await buildApp(mockRepository());
    const res = await request(app.getHttpServer())
      .get('/glossary?letter=AB')
      .expect(400);
    expect(res.body).toMatchObject({
      status: 400,
      title: 'Bad Request',
    });
    expect(typeof res.body.detail).toBe('string');
    expect(typeof res.body.instance).toBe('string');
    expect(typeof res.body.type).toBe('string');
    await app.close();
  });
});

describe('HTTP: glossary detail', () => {
  it('returns a visible row with meta.total = 1 and ISO timestamps', async () => {
    const app = await buildApp(mockRepository());
    const res = await request(app.getHttpServer())
      .get('/glossary/dharma')
      .expect(200);
    expect(res.body.data.slug).toBe('dharma');
    expect(res.body.meta).toEqual({ total: 1 });
    expect(res.body.data.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(res.body.data.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    await app.close();
  });

  it('404s gated and missing rows as RFC 9457, leaking nothing', async () => {
    const app = await buildApp(mockRepository());
    for (const slug of ['karma', 'moksha', 'nope']) {
      const res = await request(app.getHttpServer())
        .get(`/glossary/${slug}`)
        .expect(404);
      expect(res.body).toMatchObject({
        status: 404,
        title: 'Not Found',
      });
      expect(res.body.detail).not.toMatch(/published|SEVA|tier/i);
    }
    await app.close();
  });
});

describe('HTTP: no-DB behavior', () => {
  it('maps database unavailability to RFC 9457 503, never 500', async () => {
    const failing: GlossaryRepository = {
      findAll: jest
        .fn()
        .mockRejectedValue(new DatabaseUnavailableError()),
      findBySlug: jest
        .fn()
        .mockRejectedValue(new DatabaseUnavailableError()),
    };
    const app = await buildApp(failing);
    const list = await request(app.getHttpServer())
      .get('/glossary')
      .expect(503);
    expect(list.body).toMatchObject({
      status: 503,
      title: 'Service Unavailable',
    });
    const detail = await request(app.getHttpServer())
      .get('/glossary/dharma')
      .expect(503);
    expect(detail.body.status).toBe(503);
    await app.close();
  });
});

describe('HTTP: unknown routes', () => {
  it('404s as RFC 9457 without shadowing real routes', async () => {
    const app = await buildApp(mockRepository());
    const server = app.getHttpServer();
    const unknown = await request(server).get('/no-such-route').expect(404);
    expect(unknown.body).toMatchObject({
      status: 404,
      title: 'Not Found',
    });
    // Real routes still work after the fallback has answered.
    await request(server).get('/glossary').expect(200);
    await request(server).get('/health').expect(200);
    await app.close();
  });
});

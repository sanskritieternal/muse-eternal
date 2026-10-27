import { GlossaryService } from './glossary.service';
import { GlossaryRepository } from './glossary.repository';
import { GlossaryTermRow } from './glossary.types';
import {
  BadRequestError,
  DatabaseUnavailableError,
  NotFoundError,
} from '../common/errors';

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
    workflowState: 'DRAFT',
    submittedAt: null,
    submittedBy: null,
    publishedAt: null,
    publishedBy: null,
    returnedAt: null,
    returnedBy: null,
    returnReason: null,
    archivedAt: null,
    partOfSpeech: null,
    extendedDefinition: null,
    traditionMeanings: null,
    regionalEquivalents: null,
    audioTracks: null,
    videoItems: null,
    printablePdfs: null,
    imageGallery: null,
    faqItems: null,
    localeStates: null,
    ...overrides,
  };
}

const FIXTURES: GlossaryTermRow[] = [
  row({ id: 'id-dharma', slug: 'dharma', termIast: 'dharma', title: 'Dharma' }),
  row({ id: 'id-ahimsa', slug: 'ahimsa', termIast: 'ahiṃsā', title: 'Ahimsa', devanagari: 'अहिंसा' }),
  row({ id: 'id-artha', slug: 'artha', termIast: 'artha', title: 'Artha', devanagari: 'अर्थ' }),
  row({ id: 'id-karma', slug: 'karma', termIast: 'karma', title: 'Karma', published: false }),
  row({ id: 'id-moksha', slug: 'moksha', termIast: 'mokṣa', title: 'Moksha', tierVisibility: 'SEVA' }),
  row({ id: 'id-satya', slug: 'satya', termIast: 'satya', title: 'Satya', vocabularyRequired: true }),
];

function makeService(rows: GlossaryTermRow[] = FIXTURES): GlossaryService {
  const repository: GlossaryRepository = {
    findAll: jest.fn().mockResolvedValue(rows),
    findBySlug: jest
      .fn()
      .mockImplementation((slug: string) =>
        Promise.resolve(rows.find((r) => r.slug === slug) ?? null),
      ),
  };
  return new GlossaryService(repository);
}

describe('GlossaryService gating', () => {
  it('lists only published + Free-visible + not-Vocabulary-Required rows', async () => {
    const service = makeService();
    const result = await service.list({});
    expect(result.items.map((r) => r.slug)).toEqual([
      'ahimsa',
      'artha',
      'dharma',
    ]);
    expect(result.total).toBe(3);
  });

  it('orders alphabetically by normalized IAST (diacritics stripped)', async () => {
    const service = makeService();
    const result = await service.list({});
    // ahiṃsā normalizes to ahimsa, which sorts before artha and dharma.
    expect(result.items.map((r) => r.termIast)).toEqual([
      'ahiṃsā',
      'artha',
      'dharma',
    ]);
  });

  it('filters by first letter, diacritic-insensitively', async () => {
    const service = makeService();
    const a = await service.list({ letter: 'A' });
    expect(a.items.map((r) => r.slug)).toEqual(['ahimsa', 'artha']);
    const d = await service.list({ letter: 'd' });
    expect(d.items.map((r) => r.slug)).toEqual(['dharma']);
    const z = await service.list({ letter: 'Z' });
    expect(z.items).toEqual([]);
    expect(z.total).toBe(0);
  });

  it('rejects a non-single-letter filter', async () => {
    const service = makeService();
    await expect(service.list({ letter: 'AB' })).rejects.toBeInstanceOf(
      BadRequestError,
    );
    await expect(service.list({ letter: '1' })).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });
});

describe('GlossaryService pagination', () => {
  it('pages with cursor + limit and reports hasMore/nextCursor', async () => {
    const service = makeService();
    const page1 = await service.list({ limit: '2' });
    expect(page1.items.map((r) => r.slug)).toEqual(['ahimsa', 'artha']);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.limit).toBe(2);

    const page2 = await service.list({
      cursor: page1.nextCursor as string,
      limit: '2',
    });
    expect(page2.items.map((r) => r.slug)).toEqual(['dharma']);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
    expect(page2.cursor).toBe(page1.nextCursor);
  });

  it('defaults limit to 20 and clamps above 100', async () => {
    const service = makeService();
    const def = await service.list({});
    expect(def.limit).toBe(20);
    const clamped = await service.list({ limit: '500' });
    expect(clamped.limit).toBe(100);
  });

  it('rejects non-integer and non-positive limits and bad cursors', async () => {
    const service = makeService();
    await expect(service.list({ limit: 'abc' })).rejects.toBeInstanceOf(
      BadRequestError,
    );
    await expect(service.list({ limit: '0' })).rejects.toBeInstanceOf(
      BadRequestError,
    );
    await expect(
      service.list({ cursor: 'not-a-cursor!!!' }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('GlossaryService detail', () => {
  it('returns a visible row', async () => {
    const service = makeService();
    const found = await service.detail('dharma');
    expect(found.slug).toBe('dharma');
  });

  it('404s on unpublished, tier-gated, vocabulary-required, and missing rows', async () => {
    const service = makeService();
    for (const slug of ['karma', 'moksha', 'satya', 'nope']) {
      await expect(service.detail(slug)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    }
  });

  it('propagates database unavailability untouched', async () => {
    const repository: GlossaryRepository = {
      findAll: jest
        .fn()
        .mockRejectedValue(new DatabaseUnavailableError()),
      findBySlug: jest
        .fn()
        .mockRejectedValue(new DatabaseUnavailableError()),
    };
    const service = new GlossaryService(repository);
    await expect(service.list({})).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
    await expect(service.detail('dharma')).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});

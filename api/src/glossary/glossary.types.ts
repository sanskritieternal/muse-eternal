import {
  GlossaryTerm,
  LanguageOfOrigin,
  Tier,
  WorkflowState,
} from '@prisma/client';

export type { GlossaryTerm, LanguageOfOrigin, Tier, WorkflowState };

/** Row shape the repository returns (the Prisma model, unmodified). */
export type GlossaryTermRow = GlossaryTerm;

/** Repeater row shapes (G01 v5 spec; stored as JSON — see schema). */
export interface TraditionMeaningRow {
  meaning: string;
  tradition: string;
}

export interface RegionalEquivalentRow {
  language: string;
  term: string;
}

export interface AudioTrackRow {
  licence: string;
  transcript: string;
}

export interface VideoItemRow {
  captions: string;
  duration: string;
  source: string;
}

export interface PrintablePdfRow {
  language: string;
  script: string;
}

export interface ImageGalleryRow {
  altText: string;
  caption: string;
  credit: string;
}

export interface FaqItemRow {
  answer: string;
  question: string;
}

function asJsonArray<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

/** Public shape: timestamps serialized as ISO-8601 strings.
 * Phase 3 adds the CONTENT fields (#7, #9, repeaters) under the same
 * public gate. Workflow internals (workflowState, localeStates) are
 * staff-only and never appear here. */
export interface GlossaryTermPublic {
  audioTracks: AudioTrackRow[] | null;
  banner: string;
  createdAt: string;
  devanagari: string;
  extendedDefinition: string | null;
  faqItems: FaqItemRow[] | null;
  id: string;
  imageGallery: ImageGalleryRow[] | null;
  languageOfOrigin: LanguageOfOrigin;
  partOfSpeech: string | null;
  printablePdfs: PrintablePdfRow[] | null;
  published: boolean;
  regionalEquivalents: RegionalEquivalentRow[] | null;
  rightsHolder: string;
  shortDefinition: string;
  shortDescription: string;
  slug: string;
  summary: string | null;
  termIast: string;
  tierVisibility: Tier;
  title: string;
  traditionMeanings: TraditionMeaningRow[] | null;
  updatedAt: string;
  videoItems: VideoItemRow[] | null;
  vocabularyRequired: boolean;
}

export function toPublic(row: GlossaryTermRow): GlossaryTermPublic {
  return {
    audioTracks: asJsonArray<AudioTrackRow>(row.audioTracks),
    banner: row.banner,
    createdAt: row.createdAt.toISOString(),
    devanagari: row.devanagari,
    extendedDefinition: row.extendedDefinition,
    faqItems: asJsonArray<FaqItemRow>(row.faqItems),
    id: row.id,
    imageGallery: asJsonArray<ImageGalleryRow>(row.imageGallery),
    languageOfOrigin: row.languageOfOrigin,
    partOfSpeech: row.partOfSpeech,
    printablePdfs: asJsonArray<PrintablePdfRow>(row.printablePdfs),
    published: row.published,
    regionalEquivalents: asJsonArray<RegionalEquivalentRow>(
      row.regionalEquivalents,
    ),
    rightsHolder: row.rightsHolder,
    shortDefinition: row.shortDefinition,
    shortDescription: row.shortDescription,
    slug: row.slug,
    summary: row.summary,
    termIast: row.termIast,
    tierVisibility: row.tierVisibility,
    title: row.title,
    traditionMeanings: asJsonArray<TraditionMeaningRow>(row.traditionMeanings),
    updatedAt: row.updatedAt.toISOString(),
    videoItems: asJsonArray<VideoItemRow>(row.videoItems),
    vocabularyRequired: row.vocabularyRequired,
  };
}

/** Staff shape: the public shape plus workflow internals. */
export interface GlossaryTermStaff extends GlossaryTermPublic {
  archivedAt: string | null;
  localeStates: Record<string, string> | null;
  publishedAt: string | null;
  publishedBy: string | null;
  returnedAt: string | null;
  returnedBy: string | null;
  returnReason: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  workflowState: WorkflowState;
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export function toStaff(row: GlossaryTermRow): GlossaryTermStaff {
  const base = toPublic(row);
  return {
    ...base,
    archivedAt: iso(row.archivedAt),
    localeStates:
      row.localeStates !== null && typeof row.localeStates === 'object'
        ? (row.localeStates as Record<string, string>)
        : null,
    publishedAt: iso(row.publishedAt),
    publishedBy: row.publishedBy,
    returnedAt: iso(row.returnedAt),
    returnedBy: row.returnedBy,
    returnReason: row.returnReason,
    submittedAt: iso(row.submittedAt),
    submittedBy: row.submittedBy,
    workflowState: row.workflowState,
  };
}

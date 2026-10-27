import { GlossaryTerm, LanguageOfOrigin, Tier } from '@prisma/client';

export type { GlossaryTerm, LanguageOfOrigin, Tier };

/** Row shape the repository returns (the Prisma model, unmodified). */
export type GlossaryTermRow = GlossaryTerm;

/** Public shape: timestamps serialized as ISO-8601 strings. */
export interface GlossaryTermPublic {
  banner: string;
  createdAt: string;
  devanagari: string;
  id: string;
  languageOfOrigin: LanguageOfOrigin;
  published: boolean;
  rightsHolder: string;
  shortDefinition: string;
  shortDescription: string;
  slug: string;
  summary: string | null;
  termIast: string;
  tierVisibility: Tier;
  title: string;
  updatedAt: string;
  vocabularyRequired: boolean;
}

export function toPublic(row: GlossaryTermRow): GlossaryTermPublic {
  return {
    banner: row.banner,
    createdAt: row.createdAt.toISOString(),
    devanagari: row.devanagari,
    id: row.id,
    languageOfOrigin: row.languageOfOrigin,
    published: row.published,
    rightsHolder: row.rightsHolder,
    shortDefinition: row.shortDefinition,
    shortDescription: row.shortDescription,
    slug: row.slug,
    summary: row.summary,
    termIast: row.termIast,
    tierVisibility: row.tierVisibility,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    vocabularyRequired: row.vocabularyRequired,
  };
}

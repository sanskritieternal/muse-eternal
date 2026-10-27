import { GlossaryTermRow } from './glossary.types';

/** Injection token for the glossary data layer. */
export const GLOSSARY_REPOSITORY = 'GLOSSARY_REPOSITORY';

/**
 * Thin data layer: all gating, ordering, filtering, and pagination live
 * in the service, so the repository stays trivially mockable in tests
 * and the no-DB path stays a single error mapping.
 */
export interface GlossaryRepository {
  findAll(): Promise<GlossaryTermRow[]>;
  findBySlug(slug: string): Promise<GlossaryTermRow | null>;
}

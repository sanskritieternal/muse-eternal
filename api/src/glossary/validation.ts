import { LanguageOfOrigin } from '@prisma/client';
import { ValidationError } from '../common/errors';

/**
 * G01 field validation (v5 spec validation table + mockup asterisks).
 * Requiredness follows the mockups: #1, #2, #4, #5, #6, #8, #22, #24
 * carry asterisks; #3 Summary has none (optional). NOTE the spec's
 * validation table lists Summary as "Required" — the mockup asterisk
 * convention governs here (it is also what Phase 2's schema encodes:
 * summary is the only optional content field). Flagged in the Phase 3
 * report for the spec owners to reconcile.
 * - #7 Part of Speech: optional, open vocabulary (free string).
 * - #9 Extended Definition: optional rich text.
 * - #25 Licence Type: NOT a field here — held optional per the
 *   ADR-017 variance (empty canonical vocabulary).
 * All errors are collected and reported at once (spec rule).
 */

export interface GlossaryInput {
  audioTracks?: unknown;
  banner?: unknown;
  devanagari?: unknown;
  extendedDefinition?: unknown;
  faqItems?: unknown;
  imageGallery?: unknown;
  languageOfOrigin?: unknown;
  localeStates?: unknown;
  partOfSpeech?: unknown;
  printablePdfs?: unknown;
  regionalEquivalents?: unknown;
  rightsHolder?: unknown;
  shortDefinition?: unknown;
  shortDescription?: unknown;
  slug?: unknown;
  summary?: unknown;
  tierVisibility?: unknown;
  title?: unknown;
  termIast?: unknown;
  traditionMeanings?: unknown;
  videoItems?: unknown;
  vocabularyRequired?: unknown;
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DEVANAGARI_PATTERN = /^[\u0900-\u097F\s]+$/;
/** IAST: Latin letters + combining marks + spaces/hyphens/apostrophes. */
const IAST_PATTERN = /^[\p{L}\p{M}\s\-']+$/u;
const LANGUAGES = [
  'Sanskrit',
  'Prakrit',
  'Pali',
  'Tamil',
  'Hindi',
  'Other',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function repeaterErrors(
  field: string,
  value: unknown,
  rowFields: string[],
): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [`${field} must be an array of rows.`];
  }
  const errors: string[] = [];
  value.forEach((row, index) => {
    if (!isRecord(row)) {
      errors.push(`${field}[${index}] must be an object.`);
      return;
    }
    for (const key of rowFields) {
      if (typeof row[key] !== 'string') {
        errors.push(`${field}[${index}].${key} must be a string.`);
      }
    }
  });
  return errors;
}

/**
 * Validate a staff payload. `requireAll` enforces every required field
 * (staff CREATE, and the publish gate over the stored term); drafts
 * updated with partial payloads are format-checked only, EXCEPT slug
 * (the identifier — always required and always format-checked).
 * Throws ValidationError carrying every error at once.
 */
export function validateGlossaryInput(
  input: GlossaryInput,
  options: { requireAll: boolean },
): void {
  const errors: string[] = [];
  const required = (
    field: string,
    present: boolean,
    message: string,
  ): void => {
    if (options.requireAll && !present) {
      errors.push(message);
    }
    void field;
  };

  if (typeof input.slug !== 'string' || !SLUG_PATTERN.test(input.slug)) {
    errors.push('Slug is required: lowercase letters, numbers, hyphens only.');
  }
  const has = (value: unknown): boolean =>
    typeof value === 'string' && value.trim().length > 0;

  required('title', has(input.title), 'Title / Term is required.');
  if (input.title != null && typeof input.title !== 'string') {
    errors.push('Title / Term must be a string.');
  }
  required(
    'shortDescription',
    has(input.shortDescription),
    'Short description is required (max 200 chars).',
  );
  if (typeof input.shortDescription === 'string') {
    if (input.shortDescription.length > 200) {
      errors.push('Short description must be at most 200 characters.');
    }
  } else if (input.shortDescription != null) {
    errors.push('Short description must be a string.');
  }
  if (input.summary != null && typeof input.summary !== 'string') {
    errors.push('Summary must be a string.');
  }
  required('termIast', has(input.termIast), 'Term (IAST) is required.');
  if (typeof input.termIast === 'string' && !IAST_PATTERN.test(input.termIast)) {
    errors.push('Use standard IAST transliteration.');
  }
  required('devanagari', has(input.devanagari), 'Devanagari is required.');
  if (
    typeof input.devanagari === 'string' &&
    !DEVANAGARI_PATTERN.test(input.devanagari)
  ) {
    errors.push('Use Devanagari script for the Sanskrit term.');
  }
  required(
    'languageOfOrigin',
    typeof input.languageOfOrigin === 'string' &&
      (LANGUAGES as readonly string[]).includes(input.languageOfOrigin),
    'Choose the language of origin.',
  );
  required(
    'shortDefinition',
    has(input.shortDefinition),
    'Short definition is required (max 200 chars).',
  );
  if (typeof input.shortDefinition === 'string') {
    if (input.shortDefinition.length > 200) {
      errors.push('Short definition must be at most 200 characters.');
    }
  } else if (input.shortDefinition != null) {
    errors.push('Short definition must be a string.');
  }
  required('banner', has(input.banner), 'Upload the banner image.');
  required('rightsHolder', has(input.rightsHolder), 'Rights holder is required.');
  if (input.partOfSpeech != null && typeof input.partOfSpeech !== 'string') {
    errors.push('Part of Speech must be a string.');
  }
  if (
    input.extendedDefinition != null &&
    typeof input.extendedDefinition !== 'string'
  ) {
    errors.push('Extended Definition must be a string.');
  }
  if (input.tierVisibility != null) {
    const tiers = ['FREE', 'SEVA', 'PREMIUM', 'ULTRA'];
    if (
      typeof input.tierVisibility !== 'string' ||
      !tiers.includes(input.tierVisibility)
    ) {
      errors.push('tierVisibility must be FREE, SEVA, PREMIUM, or ULTRA.');
    }
  }
  if (
    input.vocabularyRequired != null &&
    typeof input.vocabularyRequired !== 'boolean'
  ) {
    errors.push('vocabularyRequired must be a boolean.');
  }
  if (input.localeStates != null && !isRecord(input.localeStates)) {
    errors.push('localeStates must be an object mapping locale to state.');
  } else if (isRecord(input.localeStates)) {
    const states = ['draft', 'review', 'approve', 'published'];
    for (const [locale, state] of Object.entries(input.localeStates)) {
      if (typeof state !== 'string' || !states.includes(state)) {
        errors.push(
          `localeStates.${locale} must be one of draft, review, approve, published.`,
        );
      }
    }
  }
  errors.push(
    ...repeaterErrors('traditionMeanings', input.traditionMeanings, [
      'tradition',
      'meaning',
    ]),
    ...repeaterErrors('regionalEquivalents', input.regionalEquivalents, [
      'language',
      'term',
    ]),
    ...repeaterErrors('audioTracks', input.audioTracks, [
      'licence',
      'transcript',
    ]),
    ...repeaterErrors('videoItems', input.videoItems, [
      'source',
      'duration',
      'captions',
    ]),
    ...repeaterErrors('printablePdfs', input.printablePdfs, [
      'language',
      'script',
    ]),
    ...repeaterErrors('imageGallery', input.imageGallery, [
      'caption',
      'credit',
      'altText',
    ]),
    ...repeaterErrors('faqItems', input.faqItems, ['question', 'answer']),
  );

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

/** The publish gate's mandatory field list (for gate reporting). */
export const PUBLISH_REQUIRED_FIELDS = [
  'title',
  'shortDescription',
  'termIast',
  'devanagari',
  'languageOfOrigin',
  'shortDefinition',
  'banner',
  'rightsHolder',
  'slug',
] as const;

export type LanguageOfOriginValue = (typeof LANGUAGES)[number];

export function asLanguage(value: unknown): LanguageOfOrigin | null {
  if (
    typeof value === 'string' &&
    (LANGUAGES as readonly string[]).includes(value)
  ) {
    return value as LanguageOfOrigin;
  }
  return null;
}

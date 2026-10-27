import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../common/errors';
import {
  GLOSSARY_REPOSITORY,
  GlossaryRepository,
} from './glossary.repository';
import { GlossaryTermRow } from './glossary.types';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface ListQuery {
  cursor?: string;
  letter?: string;
  limit?: string;
}

export interface ListResult {
  cursor: string | null;
  hasMore: boolean;
  items: GlossaryTermRow[];
  limit: number;
  nextCursor: string | null;
  total: number;
}

/**
 * Public-read rules, enforced server-side on every read:
 * a row is publicly visible only when published AND Free-visible AND
 * not Vocabulary Required. Anything else behaves as if it does not
 * exist (404 on detail, absent from lists) — never leaked content.
 */
export function isPubliclyVisible(row: GlossaryTermRow): boolean {
  return (
    row.published &&
    row.tierVisibility === 'FREE' &&
    !row.vocabularyRequired
  );
}

/** Diacritic-insensitive normalization for ordering and filtering. */
export function normalizeIast(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function sortKey(row: GlossaryTermRow): string {
  return normalizeIast(row.termIast);
}

function encodeCursor(row: GlossaryTermRow): string {
  return Buffer.from(`${sortKey(row)}\n${row.id}`, 'utf8').toString(
    'base64url',
  );
}

function decodeCursor(cursor: string): { id: string; key: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new BadRequestError('Invalid cursor.');
  }
  const newline = decoded.indexOf('\n');
  if (newline <= 0 || newline === decoded.length - 1) {
    throw new BadRequestError('Invalid cursor.');
  }
  return { id: decoded.slice(newline + 1), key: decoded.slice(0, newline) };
}

function parseLimit(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError('limit must be a positive integer.');
  }
  return Math.min(parsed, MAX_LIMIT);
}

@Injectable()
export class GlossaryService {
  constructor(
    @Inject(GLOSSARY_REPOSITORY)
    private readonly repository: GlossaryRepository,
  ) {}

  async list(query: ListQuery): Promise<ListResult> {
    const limit = parseLimit(query.limit);
    let letter: string | null = null;
    if (query.letter !== undefined) {
      if (!/^[A-Za-z]$/.test(query.letter)) {
        throw new BadRequestError('letter must be a single A-Z letter.');
      }
      letter = query.letter.toUpperCase();
    }
    const cursor = query.cursor
      ? decodeCursor(query.cursor)
      : null;

    const rows = await this.repository.findAll();
    const visible = rows
      .filter(isPubliclyVisible)
      .sort(
        (a, b) =>
          sortKey(a).localeCompare(sortKey(b)) ||
          a.id.localeCompare(b.id),
      );
    const filtered =
      letter === null
        ? visible
        : visible.filter(
            (row) => sortKey(row).charAt(0).toUpperCase() === letter,
          );

    let start = 0;
    if (cursor) {
      start = filtered.findIndex(
        (row) =>
          sortKey(row) > cursor.key ||
          (sortKey(row) === cursor.key && row.id > cursor.id),
      );
      if (start === -1) {
        start = filtered.length;
      }
    }

    const items = filtered.slice(start, start + limit);
    const hasMore = start + limit < filtered.length;
    return {
      cursor: query.cursor ?? null,
      hasMore,
      items,
      limit,
      nextCursor:
        hasMore && items.length > 0
          ? encodeCursor(items[items.length - 1])
          : null,
      total: filtered.length,
    };
  }

  async detail(slug: string): Promise<GlossaryTermRow> {
    const row = await this.repository.findBySlug(slug);
    if (!row || !isPubliclyVisible(row)) {
      throw new NotFoundError('Glossary term not found.');
    }
    return row;
  }
}

/** Response envelope: every API response uses { data, meta }. */

export interface ListMeta {
  cursor: string | null;
  hasMore: boolean;
  limit: number;
  nextCursor: string | null;
  total: number;
}

export interface SingleMeta {
  total: 1;
}

export interface Envelope<T, M> {
  data: T;
  meta: M;
}

export function singleEnvelope<T>(data: T): Envelope<T, SingleMeta> {
  return { data, meta: { total: 1 } };
}

export function listEnvelope<T>(
  data: T[],
  meta: ListMeta,
): Envelope<T[], ListMeta> {
  return { data, meta };
}

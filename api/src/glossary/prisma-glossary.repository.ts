import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseUnavailableError } from '../common/errors';
import {
  GlossaryRepository,
} from './glossary.repository';
import { GlossaryTermRow } from './glossary.types';

/**
 * Prisma-backed repository. The client is constructed lazily-guarded:
 * if construction fails (no DATABASE_URL, no engine), or any query
 * fails with a connection/initialization error, the repository reports
 * DatabaseUnavailableError — which the filter renders as 503, never
 * 500 and never fabricated data.
 */
@Injectable()
export class PrismaGlossaryRepository implements GlossaryRepository {
  private readonly client: PrismaClient | null;

  constructor() {
    let client: PrismaClient | null = null;
    try {
      client = new PrismaClient();
    } catch {
      client = null;
    }
    this.client = client;
  }

  async findAll(): Promise<GlossaryTermRow[]> {
    try {
      const client = this.requireClient();
      return await client.glossaryTerm.findMany({
        orderBy: { termIast: 'asc' },
      });
    } catch (error) {
      throw this.asUnavailable(error);
    }
  }

  async findBySlug(slug: string): Promise<GlossaryTermRow | null> {
    try {
      const client = this.requireClient();
      return await client.glossaryTerm.findUnique({ where: { slug } });
    } catch (error) {
      throw this.asUnavailable(error);
    }
  }

  private requireClient(): PrismaClient {
    if (!this.client) {
      throw new DatabaseUnavailableError();
    }
    return this.client;
  }

  private asUnavailable(error: unknown): Error {
    if (error instanceof DatabaseUnavailableError) {
      return error;
    }
    return new DatabaseUnavailableError();
  }
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch, type Envelope } from '@/lib/api';

interface StaffTermRow {
  slug: string;
  title: string;
  workflowState: string;
  published: boolean;
}

const EMPTY_CREATE = {
  banner: '',
  devanagari: '',
  languageOfOrigin: 'Sanskrit',
  rightsHolder: '',
  shortDefinition: '',
  shortDescription: '',
  slug: '',
  termIast: '',
  title: '',
};

export default function GlossaryListPage() {
  const [terms, setTerms] = useState<StaffTermRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Envelope<StaffTermRow[]>>(
        '/staff/glossary?limit=100',
      );
      setTerms(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load terms.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiFetch<Envelope<unknown>>('/staff/glossary', {
        body: JSON.stringify(form),
        method: 'POST',
      });
      setForm(EMPTY_CREATE);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setCreating(false);
    }
  }

  const set = (key: keyof typeof EMPTY_CREATE) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <h1>Glossary — staff list</h1>
      {error ? <p role="alert">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Slug</th>
            <th>Title</th>
            <th>State</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t) => (
            <tr key={t.slug}>
              <td>
                <Link href={`/glossary/${t.slug}`}>{t.slug}</Link>
              </td>
              <td>{t.title}</td>
              <td>{t.workflowState}</td>
              <td>{t.published ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>New term (Draft)</h2>
      <form onSubmit={create} style={{ display: 'grid', gap: '0.5rem' }}>
        {(
          [
            ['slug', 'Slug (lowercase, numbers, hyphens)'],
            ['title', 'Title / Term (#1)'],
            ['shortDescription', 'Short description (#2, max 200)'],
            ['termIast', 'Term (IAST) (#4)'],
            ['devanagari', 'Devanagari (#5)'],
            ['shortDefinition', 'Short definition (#8, max 200)'],
            ['banner', 'Banner (#22)'],
            ['rightsHolder', 'Rights holder (#24)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              value={form[key]}
              onChange={(e) => set(key)(e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        ))}
        <label>
          Language of origin (#6)
          <select
            value={form.languageOfOrigin}
            onChange={(e) => set('languageOfOrigin')(e.target.value)}
            style={{ display: 'block' }}
          >
            {['Sanskrit', 'Prakrit', 'Pali', 'Tamil', 'Hindi', 'Other'].map(
              (l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ),
            )}
          </select>
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create draft'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import WorkflowBar, {
  type Assignment,
  type Reviewer,
} from '@/components/WorkflowBar';
import { apiFetch, type Envelope } from '@/lib/api';

interface StaffTerm {
  archivedAt: string | null;
  banner: string;
  id: string;
  createdAt: string;
  devanagari: string;
  extendedDefinition: string | null;
  languageOfOrigin: string;
  localeStates: Record<string, string> | null;
  partOfSpeech: string | null;
  published: boolean;
  rightsHolder: string;
  shortDefinition: string;
  shortDescription: string;
  slug: string;
  summary: string | null;
  termIast: string;
  title: string;
  updatedAt: string;
  workflowState: string;
}

interface VersionRow {
  createdAt: string;
  id: string;
  label: string;
  major: number;
  minor: number;
}

interface AuditRow {
  action: string;
  actorId: string;
  createdAt: string;
  id: string;
  summary: string;
  targetId: string;
  targetType: string;
}

export default function GlossaryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [term, setTerm] = useState<StaffTerm | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditDenied, setAuditDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [autosave, setAutosave] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, v, a, r] = await Promise.all([
        apiFetch<Envelope<StaffTerm>>(`/staff/glossary/${slug}`),
        apiFetch<Envelope<VersionRow[]>>(`/staff/glossary/${slug}/versions`),
        apiFetch<Envelope<Assignment[]>>(
          `/staff/glossary/${slug}/assignments`,
        ),
        apiFetch<Envelope<Reviewer[]>>('/staff/glossary/reviewers'),
      ]);
      setTerm(t.data);
      setForm({
        banner: t.data.banner,
        devanagari: t.data.devanagari,
        extendedDefinition: t.data.extendedDefinition ?? '',
        languageOfOrigin: t.data.languageOfOrigin,
        partOfSpeech: t.data.partOfSpeech ?? '',
        rightsHolder: t.data.rightsHolder,
        shortDefinition: t.data.shortDefinition,
        shortDescription: t.data.shortDescription,
        summary: t.data.summary ?? '',
        termIast: t.data.termIast,
        title: t.data.title,
      });
      setDirty(false);
      setVersions(v.data);
      setAssignments(a.data);
      setReviewers(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load term.');
    }
    try {
      const au = await apiFetch<Envelope<AuditRow[]>>(
        '/staff/audit?limit=50',
      );
      setAudit(au.data);
    } catch {
      // audit.view is not held by every staff role (Editor has no
      // audit.view); the term page still works without the section.
      setAuditDenied(true);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  // Autosave coalescing (server-side, 5-minute window): when enabled,
  // edits PATCH with autosave=true after a short debounce instead of
  // creating a new version per keystroke burst.
  useEffect(() => {
    if (!autosave || !dirty || !term) {
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<Envelope<unknown>>(`/staff/glossary/${slug}`, {
        body: JSON.stringify({ ...form, autosave: true }),
        method: 'PATCH',
      })
        .then(() => {
          setDirty(false);
          setSaved('Autosaved (coalesced).');
        })
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Autosave failed.'),
        );
    }, 800);
    return () => clearTimeout(timer);
  }, [autosave, dirty, form, slug, term]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    try {
      await apiFetch<Envelope<unknown>>(`/staff/glossary/${slug}`, {
        body: JSON.stringify(form),
        method: 'PATCH',
      });
      setDirty(false);
      setSaved('Saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  const set = (key: string) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  if (!term) {
    return (
      <div>
        <h1>Glossary term</h1>
        {error ? <p role="alert">{error}</p> : <p>Loading…</p>}
      </div>
    );
  }

  const relatedAudit = audit.filter((row) => row.targetId === term.id);

  return (
    <div>
      <h1>
        {term.title} <small>({term.workflowState})</small>
      </h1>
      <p>
        Slug: {term.slug} · Published: {term.published ? 'yes' : 'no'} ·
        Archived: {term.archivedAt ? 'yes' : 'no'}
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {saved ? <p>{saved}</p> : null}

      <form onSubmit={save} style={{ display: 'grid', gap: '0.5rem' }}>
        {(
          [
            ['title', 'Title / Term (#1)'],
            ['shortDescription', 'Short description (#2)'],
            ['summary', 'Summary (#3, optional)'],
            ['termIast', 'Term (IAST) (#4)'],
            ['devanagari', 'Devanagari (#5)'],
            ['shortDefinition', 'Short definition (#8)'],
            ['partOfSpeech', 'Part of Speech (#7, optional)'],
            ['extendedDefinition', 'Extended Definition (#9, optional)'],
            ['banner', 'Banner (#22)'],
            ['rightsHolder', 'Rights holder (#24)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={form[key] ?? ''}
              onChange={(e) => set(key)(e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        ))}
        <label>
          Language of origin (#6)
          <select
            value={form.languageOfOrigin ?? ''}
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
        <label>
          <input
            type="checkbox"
            checked={autosave}
            onChange={(e) => setAutosave(e.target.checked)}
          />{' '}
          Autosave (coalesced server-side, 5-minute window)
        </label>
        <button type="submit">Save edit</button>
      </form>

      <WorkflowBar
        assignments={assignments}
        reviewers={reviewers}
        term={{ slug: term.slug, workflowState: term.workflowState }}
        onChanged={load}
      />

      <section style={{ marginTop: '1rem' }}>
        <h2>Versions (append-only)</h2>
        <ul>
          {versions.map((v) => (
            <li key={v.id}>
              {v.label} — {v.createdAt}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <h2>Review assignments</h2>
        <ul>
          {assignments.map((a) => (
            <li key={a.id}>
              {a.reviewerId ?? 'unassigned'} — {a.status}/{a.outcome}
            </li>
          ))}
        </ul>
      </section>

      {!auditDenied ? (
        <section style={{ marginTop: '1rem' }}>
          <h2>Audit (recent, this term)</h2>
          <ul>
            {relatedAudit.map((row) => (
              <li key={row.id}>
                {row.createdAt} — {row.action} by {row.actorId}:{' '}
                {row.summary}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

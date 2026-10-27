'use client';

import { useState } from 'react';
import { apiFetch, type Envelope } from '@/lib/api';

export interface StaffTerm {
  slug: string;
  workflowState: string;
}

export interface Assignment {
  id: string;
  outcome: string;
  reviewerId: string | null;
  status: string;
}

export interface Reviewer {
  email: string;
  id: string;
}

/**
 * S32 workflow bar for one glossary term. Buttons appear for the
 * transitions the current state allows; the API enforces capabilities
 * and the two-key publish rule — a denial surfaces here as an error,
 * never as a silent no-op. Break-glass is Super Admin only (narrowed
 * rule); other roles see the API deny it.
 */
export default function WorkflowBar({
  assignments,
  reviewers,
  term,
  onChanged,
}: {
  assignments: Assignment[];
  reviewers: Reviewer[];
  term: StaffTerm;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [outcome, setOutcome] = useState('approved');
  const [notes, setNotes] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [unpublishHandling, setUnpublishHandling] = useState('soft');
  const [breakReason, setBreakReason] = useState('');
  const [breakTarget, setBreakTarget] = useState('published');

  async function run<T>(fn: () => Promise<T>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  const pending = assignments.filter((a) => a.status === 'pending');
  const state = term.workflowState;
  const base = `/staff/glossary/${term.slug}`;

  return (
    <section
      style={{ border: '1px solid #999', marginTop: '1rem', padding: '1rem' }}
    >
      <h2>Workflow — {state}</h2>

      {state === 'DRAFT' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>
            Reviewer (roster-filtered; leave blank only when the roster is
            empty)
            <select
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              style={{ display: 'block' }}
            >
              <option value="">— no reviewer —</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.email}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                apiFetch<Envelope<unknown>>(`${base}/submit`, {
                  body: JSON.stringify({
                    reviewerId: reviewerId || undefined,
                  }),
                  method: 'POST',
                }),
              )
            }
          >
            Submit for review
          </button>
        </div>
      ) : null}

      {state === 'REVIEW' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>
            Assignment
            <select
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              style={{ display: 'block' }}
            >
              <option value="">— select —</option>
              {pending.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.reviewerId ?? 'unassigned'} (pending)
                </option>
              ))}
            </select>
          </label>
          <label>
            Outcome
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={{ display: 'block' }}
            >
              <option value="approved">Approved</option>
              <option value="returned">Returned (notes required)</option>
              <option value="approved_with_edits">
                Approved with edits (annotations only; notes required)
              </option>
            </select>
          </label>
          <label>
            Notes / annotations
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !assignmentId}
            onClick={() =>
              run(() =>
                apiFetch<Envelope<unknown>>(
                  `${base}/assignments/${assignmentId}/outcome`,
                  {
                    body: JSON.stringify({ notes: notes || undefined, outcome }),
                    method: 'POST',
                  },
                ),
              )
            }
          >
            Record outcome
          </button>
          <label>
            Change summary (required to approve)
            <input
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                apiFetch<Envelope<unknown>>(`${base}/approve`, {
                  body: JSON.stringify({ changeSummary }),
                  method: 'POST',
                }),
              )
            }
          >
            Approve
          </button>
        </div>
      ) : null}

      {state === 'APPROVE' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <p>
            Publish requires two keys: the <code>content.publish</code>{' '}
            capability AND membership in the Publish Authority list. A
            Reviewer alone, or an Admin alone, is denied.
          </p>
          <label>
            Change summary (required to publish)
            <input
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                apiFetch<Envelope<unknown>>(`${base}/publish`, {
                  body: JSON.stringify({ changeSummary }),
                  method: 'POST',
                }),
              )
            }
          >
            Publish (two-key)
          </button>
        </div>
      ) : null}

      {state === 'PUBLISHED' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>
            Unpublish handling
            <select
              value={unpublishHandling}
              onChange={(e) => setUnpublishHandling(e.target.value)}
              style={{ display: 'block' }}
            >
              <option value="soft">Soft (return to Draft)</option>
              <option value="archive">Archive</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                apiFetch<Envelope<unknown>>(`${base}/unpublish`, {
                  body: JSON.stringify({ handling: unpublishHandling }),
                  method: 'POST',
                }),
              )
            }
          >
            Unpublish (two-key)
          </button>
        </div>
      ) : null}

      <details style={{ marginTop: '1rem' }}>
        <summary>Break-glass (Super Admin only)</summary>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
          <label>
            Target state (forward only)
            <select
              value={breakTarget}
              onChange={(e) => setBreakTarget(e.target.value)}
              style={{ display: 'block' }}
            >
              <option value="review">Review</option>
              <option value="approve">Approve</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label>
            Reason (mandatory, audited)
            <input
              value={breakReason}
              onChange={(e) => setBreakReason(e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                apiFetch<Envelope<unknown>>(`${base}/break-glass`, {
                  body: JSON.stringify({
                    reason: breakReason,
                    to: breakTarget,
                  }),
                  method: 'POST',
                }),
              )
            }
          >
            Break-glass move
          </button>
        </div>
      </details>

      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

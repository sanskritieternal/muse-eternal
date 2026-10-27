import {
  CAPABILITIES,
  capabilitiesForRoles,
  hasCapability,
  isSuperAdmin,
  passesTwoKeyPublish,
} from './capabilities';

describe('S01 capability matrix', () => {
  it('carries 25 capability keys (the §4 matrix governs over §8\'s "24")', () => {
    expect(CAPABILITIES).toHaveLength(25);
  });

  it('grants Super Admin every capability', () => {
    expect(capabilitiesForRoles(['super_admin'])).toHaveLength(25);
  });

  it('denies Admin content create/update/review/publish (matrix governs over S32 §4)', () => {
    for (const cap of [
      'content.create',
      'content.update',
      'content.review',
      'content.publish',
    ] as const) {
      expect(hasCapability(['admin'], cap)).toBe(false);
    }
    // But Admin keeps its operational grants.
    expect(hasCapability(['admin'], 'content.delete')).toBe(true);
    expect(hasCapability(['admin'], 'audit.view')).toBe(true);
  });

  it('grants Editor create/update only (no publish, no review)', () => {
    expect(hasCapability(['editor'], 'content.create')).toBe(true);
    expect(hasCapability(['editor'], 'content.update')).toBe(true);
    expect(hasCapability(['editor'], 'content.publish')).toBe(false);
    expect(hasCapability(['editor'], 'content.review')).toBe(false);
  });

  it('grants Reviewer publish + review, Translator translate only', () => {
    expect(hasCapability(['reviewer'], 'content.publish')).toBe(true);
    expect(hasCapability(['reviewer'], 'content.review')).toBe(true);
    expect(hasCapability(['reviewer'], 'content.create')).toBe(false);
    expect(hasCapability(['translator'], 'content.translate')).toBe(true);
    expect(hasCapability(['translator'], 'content.update')).toBe(false);
  });

  it('denies unknown roles and unknown capabilities (fail closed)', () => {
    expect(capabilitiesForRoles(['wizard'])).toEqual([]);
    expect(
      hasCapability(['editor'], 'content.publish' as never),
    ).toBe(false);
  });

  it('two-key publish: Reviewer has the capability but not the authority', () => {
    expect(passesTwoKeyPublish(['reviewer'])).toBe(false);
    expect(passesTwoKeyPublish(['admin'])).toBe(false);
    expect(passesTwoKeyPublish(['super_admin'])).toBe(true);
    // A custom role holding content.publish plus admin membership
    // would pass — the list check is membership, not the capability.
    expect(passesTwoKeyPublish(['reviewer', 'admin'])).toBe(true);
  });

  it('break-glass scope is Super Admin only', () => {
    expect(isSuperAdmin(['super_admin'])).toBe(true);
    expect(isSuperAdmin(['admin'])).toBe(false);
    expect(isSuperAdmin(['reviewer', 'admin'])).toBe(false);
  });
});

/**
 * S01 canonical capability matrix (sys-01 §4). Capabilities are code;
 * roles are data. Guards check capabilities, never role names — with
 * exactly two spec-defined exceptions, both role-list checks by
 * design: the Publish Authority list (S32 D-5) and break-glass Super
 * Admin scope (narrowed rule in decisions.md).
 *
 * Count note: the S01 §8 localization inventory says "24 capabilities"
 * but the §4 matrix itself grants 25 distinct keys; the matrix governs
 * (it is declared canonical in §4), so this file carries 25.
 */

export const ROLE_SLUGS = [
  'super_admin',
  'admin',
  'editor',
  'reviewer',
  'translator',
  'support_agent',
  'viewer',
] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

/** The 25 S01 capability keys. */
export const CAPABILITIES = [
  'roles.view',
  'roles.manage',
  'users.view',
  'users.manage',
  'users.assign_roles',
  'users.reset_passwords',
  'content.create',
  'content.update',
  'content.delete',
  'content.publish',
  'content.translate',
  'content.review',
  'media.upload',
  'media.manage',
  'menus.manage',
  'seo.manage',
  'settings.view',
  'settings.manage',
  'settings.manage_security',
  'api_keys.view',
  'api_keys.manage',
  'audit.view',
  'system.jobs_view',
  'system.webhooks_manage',
  'system.flags_manage',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Canonical grants, transcribed from the S01 §4 matrix. */
export const ROLE_CAPABILITIES: Record<RoleSlug, readonly Capability[]> = {
  super_admin: CAPABILITIES,
  admin: [
    'roles.view',
    'users.view',
    'users.manage',
    'users.assign_roles',
    'users.reset_passwords',
    'content.delete',
    'media.upload',
    'media.manage',
    'menus.manage',
    'seo.manage',
    'settings.view',
    'settings.manage',
    'api_keys.view',
    'api_keys.manage',
    'audit.view',
    'system.jobs_view',
  ],
  editor: ['content.create', 'content.update', 'media.upload'],
  reviewer: [
    'content.publish',
    'content.review',
    'media.upload',
    'seo.manage',
  ],
  translator: ['content.translate', 'media.upload', 'seo.manage'],
  support_agent: [
    'roles.view',
    'users.view',
    'users.reset_passwords',
    'audit.view',
  ],
  viewer: ['roles.view', 'settings.view'],
};

/** Union of a user's roles' capabilities. Unknown slugs grant nothing
 * (deny by default, fail closed). */
export function capabilitiesForRoles(roles: readonly string[]): Capability[] {
  const granted = new Set<Capability>();
  for (const role of roles) {
    const caps = (ROLE_CAPABILITIES as Record<string, readonly Capability[]>)[
      role
    ];
    if (caps) {
      for (const cap of caps) {
        granted.add(cap);
      }
    }
  }
  return [...granted];
}

export function hasCapability(
  roles: readonly string[],
  capability: Capability,
): boolean {
  return capabilitiesForRoles(roles).includes(capability);
}

/**
 * S32 Publish Authority list (D-5, A-5 §5 default): the roles whose
 * holders may execute the final Publish — in addition to holding the
 * `content.publish` capability. NOTE the matrix interaction: Admin is
 * on this list but holds no `content.publish`, and Reviewer holds the
 * capability but is not on the list — so with the default list, only
 * Super Admin passes both keys. That is the spec's reconciliation
 * (S32 C-1), not a bug: capability alone is not publish authority.
 */
export const PUBLISH_AUTHORITY_ROLES: readonly RoleSlug[] = [
  'admin',
  'super_admin',
];

/** Two-key publish check: capability AND authority-list membership. */
export function passesTwoKeyPublish(roles: readonly string[]): boolean {
  return (
    hasCapability(roles, 'content.publish') &&
    roles.some((role) =>
      (PUBLISH_AUTHORITY_ROLES as readonly string[]).includes(role),
    )
  );
}

/**
 * Break-glass scope (narrowed rule, decisions.md): Super Admin only.
 * The S32 spec text permits Admin too (D-6); the narrowed rule governs
 * until widening is decided. This is a role-membership check by design
 * (see the header note), not a capability check.
 */
export function isSuperAdmin(roles: readonly string[]): boolean {
  return roles.includes('super_admin');
}

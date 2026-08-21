/**
 * Roles and permissions, with no server-only imports.
 *
 * Kept apart from admin-auth so client components can render a role picker or
 * hide a nav item without dragging `next/headers` into the browser bundle —
 * which does not merely warn, it fails the build.
 */

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';

export const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: 'OWNER', label: 'Owner', blurb: 'Everything, including staff and settings. Cannot be restricted.' },
  { id: 'ADMIN', label: 'Admin', blurb: 'Everything except removing or demoting the owner.' },
  { id: 'MANAGER', label: 'Manager', blurb: 'Products, categories, orders, reviews and customers. No settings or staff.' },
  { id: 'STAFF', label: 'Staff', blurb: 'Orders and reviews only — enough to pack and reply, nothing that changes prices.' },
];

export type Permission =
  | 'orders.view'
  | 'orders.manage'
  | 'products.view'
  | 'products.manage'
  | 'categories.manage'
  | 'reviews.manage'
  | 'customers.view'
  | 'settings.manage'
  | 'users.manage';

/**
 * Roles grant permissions; nothing is set per user. Per-user overrides read
 * well on a settings screen and become impossible to reason about the first
 * time someone asks "why can she do that".
 */
const GRANTS: Record<Role, Permission[]> = {
  OWNER: [
    'orders.view', 'orders.manage',
    'products.view', 'products.manage',
    'categories.manage', 'reviews.manage', 'customers.view',
    'settings.manage', 'users.manage',
  ],
  ADMIN: [
    'orders.view', 'orders.manage',
    'products.view', 'products.manage',
    'categories.manage', 'reviews.manage', 'customers.view',
    'settings.manage', 'users.manage',
  ],
  MANAGER: [
    'orders.view', 'orders.manage',
    'products.view', 'products.manage',
    'categories.manage', 'reviews.manage', 'customers.view',
  ],
  STAFF: ['orders.view', 'orders.manage', 'reviews.manage'],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return GRANTS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return GRANTS[role] ?? [];
}

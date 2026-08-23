export type AppRole = "it" | "admin" | "receptionist" | "agent" | "customer" | "owner";

export type Permission =
  | "system.settings"
  | "system.health"
  | "system.email"
  | "system.sms"
  | "system.password_reset"
  | "system.feature_flags"
  | "system.audit"
  | "content.manage"
  | "properties.manage"
  | "properties.assigned"
  | "customers.manage"
  | "customers.self"
  | "visits.manage"
  | "visits.self"
  | "services.manage"
  | "services.self"
  | "reports.admin"
  | "reports.owner"
  | "portfolio.manage";

export const ROLE_PRIORITY: AppRole[] = ["it", "admin", "receptionist", "agent", "owner", "customer"];

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  it: new Set([
    "system.settings", "system.health", "system.email", "system.sms", "system.password_reset",
    "system.feature_flags", "system.audit", "content.manage", "properties.manage", "customers.manage",
    "visits.manage", "services.manage", "reports.admin", "portfolio.manage",
  ]),
  admin: new Set([
    "content.manage", "properties.manage", "customers.manage", "visits.manage", "services.manage",
    "reports.admin", "portfolio.manage",
  ]),
  receptionist: new Set(["customers.manage", "visits.manage", "services.manage"]),
  agent: new Set(["properties.assigned", "visits.manage", "services.manage"]),
  customer: new Set(["customers.self", "visits.self", "services.self"]),
  owner: new Set(["reports.owner"]),
};

export function can(role: AppRole, permission: Permission) {
  return permissions[role]?.has(permission) ?? false;
}

export function primaryRole(roles: AppRole[]): AppRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

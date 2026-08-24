import { BadgeCheck, FolderTree, KeyRound, LayoutDashboard, PackageSearch, ScrollText, ShieldCheck, UserCog, Users, type LucideIcon } from "lucide-react";
import type { AdminPermissionCode } from "@shared/models/organisations";

export interface AdminNavigationItem {
  path: "/admin/overview" | "/admin/users" | "/admin/verifications" | "/admin/products" | "/admin/categories" | "/admin/employees" | "/admin/roles" | "/admin/security" | "/admin/audit";
  label: string;
  description: string;
  permission: AdminPermissionCode;
  icon: LucideIcon;
}

export const ADMIN_ROUTE_PERMISSIONS: readonly AdminNavigationItem[] = [
  {
    path: "/admin/employees",
    label: "Employees",
    description: "Staff access and invitations",
    permission: "employees.view",
    icon: UserCog,
  },
  {
    path: "/admin/roles",
    label: "Roles",
    description: "Role and permission matrix",
    permission: "employees.view",
    icon: KeyRound,
  },
  {
    path: "/admin/security",
    label: "Security",
    description: "MFA, sessions and sign-in events",
    permission: "security.manage",
    icon: ShieldCheck,
  },
  {
    path: "/admin/categories",
    label: "Categories",
    description: "Taxonomy drafts and publishing",
    permission: "categories.view",
    icon: FolderTree,
  },
  {
    path: "/admin/overview",
    label: "Overview",
    description: "Platform health and pending work",
    permission: "dashboard.view",
    icon: LayoutDashboard,
  },
  {
    path: "/admin/users",
    label: "Users",
    description: "Accounts, eligibility and notes",
    permission: "users.view",
    icon: Users,
  },
  {
    path: "/admin/verifications",
    label: "Verification centre",
    description: "Seller evidence and decisions",
    permission: "verification.view",
    icon: BadgeCheck,
  },
  {
    path: "/admin/products",
    label: "Products",
    description: "Catalogue moderation and placement",
    permission: "products.view",
    icon: PackageSearch,
  },
  {
    path: "/admin/audit",
    label: "Audit logs",
    description: "Durable administrative activity",
    permission: "audit.view",
    icon: ScrollText,
  },
] as const;

export function visibleAdminNavigation(permissions: readonly AdminPermissionCode[]): AdminNavigationItem[] {
  return ADMIN_ROUTE_PERMISSIONS.filter((item) => permissions.includes(item.permission));
}

export function adminRouteLabel(path: string): string {
  return ADMIN_ROUTE_PERMISSIONS.find((item) => path.startsWith(item.path))?.label ?? "Organisation Portal";
}

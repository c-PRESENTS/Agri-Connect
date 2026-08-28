import { SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { AdminPermissionCode } from "@shared/models/organisations";

export interface AdminNavigationItem {
  path: "/admin/control-centre";
  label: string;
  description: string;
  permission: AdminPermissionCode;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

export const ADMIN_ROUTE_PERMISSIONS: readonly AdminNavigationItem[] = [
  {
    path: "/admin/control-centre",
    label: "Control Centre",
    description: "Integrated Super Admin operations",
    permission: "dashboard.view",
    icon: SlidersHorizontal,
  },
] as const;

export function visibleAdminNavigation(permissions: readonly AdminPermissionCode[], _isSuperAdmin = false): AdminNavigationItem[] {
  return ADMIN_ROUTE_PERMISSIONS.filter((item) => permissions.includes(item.permission));
}

export function adminRouteLabel(_path: string): string {
  return "Control Centre";
}

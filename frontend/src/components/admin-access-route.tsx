import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { AdminPermissionCode } from "@shared/models/organisations";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useAuth } from "@/hooks/use-auth";
import { getLoginPath } from "@/lib/auth-utils";

interface AdminAccessRouteProps {
  children: React.ReactNode;
  permission: AdminPermissionCode;
}

export function AdminAccessRoute({ children, permission }: AdminAccessRouteProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const access = useAdminAccess();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setLocation(getLoginPath(`${window.location.pathname}${window.location.search}`));
      return;
    }
    if (!access.isLoading && (!access.data?.hasAccess || !access.hasPermission(permission))) {
      setLocation("/dashboard");
    }
  }, [access.data, access.isLoading, isAuthenticated, isAuthLoading, permission, setLocation]);

  if (
    isAuthLoading ||
    !isAuthenticated ||
    access.isLoading ||
    !access.data?.hasAccess ||
    !access.hasPermission(permission)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="loading-admin-access">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

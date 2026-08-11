import { useQuery } from "@tanstack/react-query";
import type { AdminAccessContext, AdminPermissionCode } from "@shared/models/organisations";
import { getQueryFn } from "@/lib/queryClient";

export function useAdminAccess() {
  const query = useQuery<AdminAccessContext>({
    queryKey: ["/api/admin/access"],
    queryFn: getQueryFn<AdminAccessContext>({ on401: "throw" }),
    retry: false,
    staleTime: 60_000,
  });

  return {
    ...query,
    hasPermission: (permission: AdminPermissionCode) =>
      Boolean(query.data?.hasAccess && query.data.permissions.includes(permission)),
  };
}

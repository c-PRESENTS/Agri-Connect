import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User, UpdateProfileInput } from "@shared/schema";

/**
 * Replit Auth client hook. Authentication is performed by navigating to
 * /api/login (and /api/logout). This hook only exposes the current session
 * state and a profile-update mutation.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: UpdateProfileInput) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", updates);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const completeProfile = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/profile/complete", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = () => {
    window.location.href = "/api/logout";
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    completeProfile,
  };
}

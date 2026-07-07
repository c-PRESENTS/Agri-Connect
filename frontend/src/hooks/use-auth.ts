import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User, UpdateProfileInput } from "@shared/schema";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = LoginInput & {
  name?: string;
};

type SendOtpInput = {
  phone: string;
};

type VerifyOtpInput = {
  phone: string;
  code: string;
};

type GoogleLoginInput = {
  credential: string;
};

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

  const login = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const register = useMutation({
    mutationFn: async (credentials: RegisterInput) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const sendOtp = useMutation({
    mutationFn: async (input: SendOtpInput) => {
      const res = await apiRequest("POST", "/api/auth/otp/send", input);
      return res.json();
    },
  });

  const verifyOtp = useMutation({
    mutationFn: async (input: VerifyOtpInput) => {
      const res = await apiRequest("POST", "/api/auth/otp/verify", input);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
    },
  });

  const googleLogin = useMutation({
    mutationFn: async (input: GoogleLoginInput) => {
      const res = await apiRequest("POST", "/api/auth/google", input);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
    },
  });

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    queryClient.setQueryData(["/api/auth/user"], null);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    sendOtp,
    verifyOtp,
    googleLogin,
    logout,
    updateProfile,
    completeProfile,
  };
}

import { createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";

type User = {
  id: string;
  type: "advisor" | "associate";
  name: string;
  email: string;
  role?: string;
  title?: string;
  avatarUrl?: string | null;
  advisorId?: string;
  onboardingCompleted?: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, title?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      try { sessionStorage.setItem("od-was-auth", "1"); } catch {}
      queryClient.invalidateQueries();
      // If we're on /login (auth route group), redirect to dashboard.
      // The dashboard layout renders login inline when user is null,
      // but after logout hard-redirects to /login, we need to navigate back.
      if (typeof window !== "undefined" && window.location.pathname === "/login") {
        window.location.href = "/";
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ name, email, password, title }: { name: string; email: string; password: string; title?: string }) => {
      const res = await apiRequest("POST", "/api/auth/signup", { name, email, password, title });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      queryClient.invalidateQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
      queryClient.clear();
      try { sessionStorage.removeItem("od-was-auth"); } catch {}
      // Defer localStorage cleanup so it runs AFTER PersistQueryClient's
      // write-back cycle (which fires synchronously on cache mutations).
      // Then hard-redirect to /login to force a full page reload — this
      // guarantees a clean PersistQueryClientProvider mount with empty storage.
      setTimeout(() => {
        try { localStorage.removeItem("wm-query-cache"); } catch {}
        try { localStorage.removeItem("onedigital-recent-clients"); } catch {}
        window.location.href = "/login";
      }, 100);
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const signup = async (name: string, email: string, password: string, title?: string) => {
    await signupMutation.mutateAsync({ name, email, password, title });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

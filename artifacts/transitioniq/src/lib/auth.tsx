import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";
import { useLocation } from "wouter";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "employer" | "employee" | "consultant" | "admin";
  employerId?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("tiq_token");
    if (stored) {
      api.get<{ user: AuthUser; authenticated: boolean }>("/auth/session").then(r => {
        setUser(r.user);
        setIsLoading(false);
      }).catch(() => {
        localStorage.removeItem("tiq_token");
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password });
    localStorage.setItem("tiq_token", r.token);
    setUser(r.user);
  };

  const demoLogin = async (role: string) => {
    const r = await api.post<{ token: string; user: AuthUser }>("/auth/demo-login", { role });
    localStorage.setItem("tiq_token", r.token);
    setUser(r.user);
  };

  const logout = () => {
    api.post("/auth/logout", {}).catch(() => {});
    localStorage.removeItem("tiq_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && allowedRoles && user && !allowedRoles.includes(user.role)) {
      const roleHome: Record<string, string> = {
        employer: "/employer/dashboard",
        employee: "/employee/dashboard",
        consultant: "/consultant/dashboard",
        admin: "/admin/dashboard",
      };
      setLocation(roleHome[user.role] ?? "/login");
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, setLocation]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading...</div>;
  if (!isAuthenticated) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
}

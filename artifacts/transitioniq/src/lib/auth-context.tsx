import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "employer" | "employee" | "consultant" | "admin";
  employerId?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("tiq_token");
    if (stored) {
      setToken(stored);
      api.get<{ user: AuthUser }>("/auth/session").then(r => {
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
    setToken(r.token);
    setUser(r.user);
  };

  const demoLogin = async (role: string) => {
    const r = await api.post<{ token: string; user: AuthUser }>("/auth/demo-login", { role });
    localStorage.setItem("tiq_token", r.token);
    setToken(r.token);
    setUser(r.user);
  };

  const logout = () => {
    api.post("/auth/logout", {}).catch(() => {});
    localStorage.removeItem("tiq_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

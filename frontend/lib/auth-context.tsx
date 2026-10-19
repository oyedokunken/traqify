"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { setSession, clearSession, getStoredUser } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MANAGER" | "CASHIER" | "AUDITOR";
  organizationId: string | null;
  avatarUrl: string | null;
  phone?: string | null;
  signInMethod?: "EMAIL" | "GOOGLE";
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data);
      try { localStorage.setItem("traqify_user", JSON.stringify(data)); } catch { /* storage unavailable */ }
    } catch {
      clearSession();
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    setSession(data.token, data.user);
    setUser(data.user);
  };

  const logout = () => {
    // Ends the session on the server (clears the refresh cookie and invalidates every token), then forgets it here.
    api.post("/api/auth/logout", {}, { headers: { "X-Requested-By": "traqify" } }).catch(() => {});
    clearSession();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
